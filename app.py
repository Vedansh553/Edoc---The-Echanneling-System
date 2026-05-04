from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql
import pymysql.cursors
import jwt
import datetime
import io

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    PDF_OK = True
except:
    PDF_OK = False

app = Flask(__name__)
CORS(app, origins="*")
SECRET = 'edoc2024secret'

# ── MySQL Connection ──────────────────────────
def db():
    return pymysql.connect(
        host='127.0.0.1',
        port=3306,
        user='root',
        password='',
        database='edoc_db',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10
    )

def get_token(req):
    h = req.headers.get('Authorization', '')
    p = h.split()
    return p[1] if len(p) == 2 and p[0] == 'Bearer' else None

def decode_token(t):
    try:
        return jwt.decode(t, SECRET, algorithms=['HS256'])
    except:
        return None

def auth(req):
    t = get_token(req)
    return decode_token(t) if t else None

# ── HEALTH ────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        c = db()
        c.close()
        return jsonify({'status': 'ok', 'message': 'Working!', 'db': 'MySQL Connected!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ── REGISTER ─────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    d = request.get_json() or {}
    name  = str(d.get('name', '')).strip()
    email = str(d.get('email', '')).strip().lower()
    pwd   = str(d.get('password', ''))
    role  = str(d.get('role', 'patient'))
    phone = str(d.get('phone', ''))

    if not name or not email or not pwd:
        return jsonify({'message': 'Name, email, password required'}), 400
    if role not in ('patient', 'doctor', 'admin'):
        role = 'patient'

    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT id FROM users WHERE email=%s", (email,))
            if c.fetchone():
                return jsonify({'message': 'Email already registered'}), 409
            c.execute(
                "INSERT INTO users (name,email,password,role,phone) VALUES (%s,%s,%s,%s,%s)",
                (name, email, generate_password_hash(pwd), role, phone)
            )
            uid = c.lastrowid
            if role == 'doctor':
                spec = str(d.get('specialization', 'General Medicine'))
                qual = str(d.get('qualification', 'MBBS'))
                exp  = int(d.get('experience', 0))
                c.execute("SELECT id FROM departments WHERE name=%s", (spec,))
                dept = c.fetchone()
                c.execute(
                    "INSERT INTO doctors (user_id,specialization,qualification,experience,department_id) VALUES (%s,%s,%s,%s,%s)",
                    (uid, spec, qual, exp, dept['id'] if dept else None)
                )
        cn.commit()
        return jsonify({'message': 'Registration successful', 'user_id': uid}), 201
    except Exception as e:
        cn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cn.close()

# ── LOGIN ─────────────────────────────────────
@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.get_json() or {}
    email = str(d.get('email', '')).strip().lower()
    pwd   = str(d.get('password', ''))
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT * FROM users WHERE email=%s", (email,))
            u = c.fetchone()
        if not u or not check_password_hash(u['password'], pwd):
            return jsonify({'message': 'Invalid email or password'}), 401
        token = jwt.encode({
            'user_id': u['id'],
            'role': u['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET, algorithm='HS256')
        return jsonify({
            'token': token,
            'user': {
                'id': u['id'], 'name': u['name'],
                'email': u['email'], 'role': u['role'], 'phone': u['phone']
            }
        })
    finally:
        cn.close()

# ── DASHBOARD STATS ───────────────────────────
@app.route('/api/dashboard/stats', methods=['GET'])
def stats():
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    today = datetime.date.today().isoformat()
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT COUNT(*) as n FROM doctors"); td = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM users WHERE role='patient'"); tp = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM appointments WHERE DATE(booked_at)=%s", (today,)); nb = c.fetchone()['n']
            c.execute("SELECT COUNT(*) as n FROM sessions WHERE DATE(scheduled_datetime)=%s", (today,)); ts = c.fetchone()['n']
        return jsonify({'total_doctors': td, 'total_patients': tp, 'new_bookings': nb, 'today_sessions': ts})
    finally:
        cn.close()

# ── DOCTORS ───────────────────────────────────
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT d.id,u.name,u.email,u.phone,
                d.specialization,d.qualification,d.experience
                FROM doctors d JOIN users u ON d.user_id=u.id''')
            return jsonify(c.fetchall())
    finally:
        cn.close()

@app.route('/api/doctors/<int:did>', methods=['GET'])
def get_doctor(did):
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT d.id,u.name,u.email,u.phone,
                d.specialization,d.qualification,d.experience
                FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.id=%s''', (did,))
            r = c.fetchone()
        return jsonify(r) if r else (jsonify({'message': 'Not found'}), 404)
    finally:
        cn.close()

@app.route('/api/doctors/<int:did>', methods=['PUT'])
def update_doctor(did):
    a = auth(request)
    if not a or a['role'] not in ('admin', 'doctor'):
        return jsonify({'message': 'Unauthorized'}), 401
    d = request.get_json() or {}
    cn = db()
    try:
        with cn.cursor() as c:
            if d.get('specialization'):
                c.execute("UPDATE doctors SET specialization=%s WHERE id=%s", (d['specialization'], did))
            if d.get('qualification'):
                c.execute("UPDATE doctors SET qualification=%s WHERE id=%s", (d['qualification'], did))
            if d.get('experience') is not None:
                c.execute("UPDATE doctors SET experience=%s WHERE id=%s", (d['experience'], did))
        cn.commit()
        return jsonify({'message': 'Updated'})
    finally:
        cn.close()

@app.route('/api/doctors/<int:did>', methods=['DELETE'])
def del_doctor(did):
    a = auth(request)
    if not a or a['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("DELETE FROM doctors WHERE id=%s", (did,))
        cn.commit()
        return jsonify({'message': 'Deleted'})
    finally:
        cn.close()

@app.route('/api/doctors/<int:did>/pdf', methods=['GET'])
def doctor_pdf(did):
    a = auth(request)
    if not a: return jsonify({'message': 'Unauthorized'}), 401
    if not PDF_OK: return jsonify({'message': 'reportlab not installed'}), 501
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT d.id,u.name,u.email,u.phone,
                d.specialization,d.qualification,d.experience
                FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.id=%s''', (did,))
            r = c.fetchone()
        if not r: return jsonify({'message': 'Not found'}), 404
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        elems = [Paragraph("eDoc - Doctor Profile", styles['Title']), Spacer(1, 0.3*inch)]
        data = [['Field','Details'],['Name',r['name']],['Email',r['email']],
                ['Phone',r['phone'] or 'N/A'],['Specialization',r['specialization']],
                ['Qualification',r['qualification']],['Experience',f"{r['experience']} years"]]
        t = Table(data, colWidths=[2.5*inch, 4*inch])
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.teal),
                               ('TEXTCOLOR',(0,0),(-1,0),colors.white),
                               ('GRID',(0,0),(-1,-1),0.5,colors.grey),
                               ('PADDING',(0,0),(-1,-1),8)]))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=f'doctor_{did}.pdf')
    finally:
        cn.close()

@app.route('/api/doctors/pdf/all', methods=['GET'])
def all_pdf():
    a = auth(request)
    if not a: return jsonify({'message': 'Unauthorized'}), 401
    if not PDF_OK: return jsonify({'message': 'reportlab not installed'}), 501
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT u.name,u.email,d.specialization,d.experience
                FROM doctors d JOIN users u ON d.user_id=u.id''')
            rows = c.fetchall()
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        elems = [Paragraph("eDoc - All Doctors", styles['Title']), Spacer(1, 0.3*inch)]
        data = [['Name','Email','Specialization','Exp']] + \
               [[r['name'],r['email'],r['specialization'],f"{r['experience']}yr"] for r in rows]
        t = Table(data, colWidths=[1.8*inch,2*inch,2*inch,0.8*inch])
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.teal),
                               ('TEXTCOLOR',(0,0),(-1,0),colors.white),
                               ('GRID',(0,0),(-1,-1),0.5,colors.grey)]))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name='all_doctors.pdf')
    finally:
        cn.close()

# ── PATIENTS ──────────────────────────────────
@app.route('/api/patients', methods=['GET'])
def get_patients():
    a = auth(request)
    if not a or a['role'] not in ('admin', 'doctor'):
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT id,name,email,phone,created_at FROM users WHERE role='patient'")
            rows = c.fetchall()
        result = []
        for r in rows:
            if hasattr(r.get('created_at'), 'strftime'):
                r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M')
            result.append(r)
        return jsonify(result)
    finally:
        cn.close()

@app.route('/api/patients/<int:pid>', methods=['GET'])
def get_patient(pid):
    a = auth(request)
    if not a or a['role'] not in ('admin', 'doctor'):
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT id,name,email,phone,created_at FROM users WHERE id=%s AND role='patient'", (pid,))
            r = c.fetchone()
        if r and hasattr(r.get('created_at'), 'strftime'):
            r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M')
        return jsonify(r) if r else (jsonify({'message': 'Not found'}), 404)
    finally:
        cn.close()

@app.route('/api/patients/<int:pid>', methods=['DELETE'])
def del_patient(pid):
    a = auth(request)
    if not a or a['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("DELETE FROM users WHERE id=%s AND role='patient'", (pid,))
        cn.commit()
        return jsonify({'message': 'Deleted'})
    finally:
        cn.close()

# ── SESSIONS ──────────────────────────────────
@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT s.id,s.title,s.scheduled_datetime,s.max_bookings,
                s.current_bookings,u.name AS doctor_name,d.id AS doctor_id
                FROM sessions s JOIN doctors d ON s.doctor_id=d.id
                JOIN users u ON d.user_id=u.id ORDER BY s.scheduled_datetime''')
            rows = c.fetchall()
        result = []
        for r in rows:
            r['available'] = r['current_bookings'] < r['max_bookings']
            if hasattr(r.get('scheduled_datetime'), 'strftime'):
                r['scheduled_datetime'] = r['scheduled_datetime'].strftime('%Y-%m-%d %H:%M')
            result.append(r)
        return jsonify(result)
    finally:
        cn.close()

@app.route('/api/sessions', methods=['POST'])
def add_session():
    a = auth(request)
    if not a or a['role'] not in ('admin', 'doctor'):
        return jsonify({'message': 'Unauthorized'}), 401
    d = request.get_json() or {}
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute(
                "INSERT INTO sessions (title,doctor_id,scheduled_datetime,max_bookings) VALUES (%s,%s,%s,%s)",
                (d['title'], d['doctor_id'], d['scheduled_datetime'], d.get('max_bookings', 10))
            )
        cn.commit()
        return jsonify({'message': 'Session created'}), 201
    finally:
        cn.close()

@app.route('/api/sessions/<int:sid>', methods=['DELETE'])
def del_session(sid):
    a = auth(request)
    if not a or a['role'] not in ('admin', 'doctor'):
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("DELETE FROM sessions WHERE id=%s", (sid,))
        cn.commit()
        return jsonify({'message': 'Deleted'})
    finally:
        cn.close()

# ── APPOINTMENTS ──────────────────────────────
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            if a['role'] in ('admin', 'doctor'):
                c.execute('''SELECT a.id,a.status,a.booked_at,
                    up.name AS patient_name,ud.name AS doctor_name,
                    s.title AS session_title,s.scheduled_datetime,s.id AS session_id
                    FROM appointments a JOIN users up ON a.patient_id=up.id
                    JOIN sessions s ON a.session_id=s.id
                    JOIN doctors d ON s.doctor_id=d.id JOIN users ud ON d.user_id=ud.id
                    ORDER BY s.scheduled_datetime DESC''')
            else:
                c.execute('''SELECT a.id,a.status,a.booked_at,
                    up.name AS patient_name,ud.name AS doctor_name,
                    s.title AS session_title,s.scheduled_datetime,s.id AS session_id
                    FROM appointments a JOIN users up ON a.patient_id=up.id
                    JOIN sessions s ON a.session_id=s.id
                    JOIN doctors d ON s.doctor_id=d.id JOIN users ud ON d.user_id=ud.id
                    WHERE a.patient_id=%s ORDER BY s.scheduled_datetime DESC''', (a['user_id'],))
            rows = c.fetchall()
        result = []
        for r in rows:
            for f in ('scheduled_datetime', 'booked_at'):
                if hasattr(r.get(f), 'strftime'):
                    r[f] = r[f].strftime('%Y-%m-%d %H:%M')
            result.append(r)
        return jsonify(result)
    finally:
        cn.close()

@app.route('/api/appointments', methods=['POST'])
def book():
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    d = request.get_json() or {}
    sid = d.get('session_id')
    pid = a['user_id']
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT * FROM sessions WHERE id=%s FOR UPDATE", (sid,))
            s = c.fetchone()
            if not s:
                return jsonify({'message': 'Session not found'}), 404
            if s['current_bookings'] >= s['max_bookings']:
                return jsonify({'message': 'Session fully booked!'}), 409
            c.execute("SELECT id FROM appointments WHERE patient_id=%s AND session_id=%s", (pid, sid))
            if c.fetchone():
                return jsonify({'message': 'Already booked!'}), 409
            c.execute("INSERT INTO appointments (patient_id,session_id,status) VALUES (%s,%s,'confirmed')", (pid, sid))
            c.execute("UPDATE sessions SET current_bookings=current_bookings+1 WHERE id=%s", (sid,))
        cn.commit()
        return jsonify({'message': 'Appointment booked!'}), 201
    except Exception as e:
        cn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cn.close()

@app.route('/api/appointments/<int:aid>', methods=['DELETE'])
def cancel(aid):
    a = auth(request)
    if not a:
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT * FROM appointments WHERE id=%s", (aid,))
            apt = c.fetchone()
            if not apt:
                return jsonify({'message': 'Not found'}), 404
            c.execute("DELETE FROM appointments WHERE id=%s", (aid,))
            c.execute("UPDATE sessions SET current_bookings=GREATEST(0,current_bookings-1) WHERE id=%s", (apt['session_id'],))
        cn.commit()
        return jsonify({'message': 'Cancelled'})
    except Exception as e:
        cn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cn.close()

# ── DEPARTMENTS ───────────────────────────────
@app.route('/api/departments', methods=['GET'])
def get_depts():
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT id,name FROM departments")
            return jsonify(c.fetchall())
    finally:
        cn.close()

@app.route('/api/departments/<int:did>/doctors', methods=['GET'])
def dept_docs(did):
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute('''SELECT d.id,u.name,u.email,d.specialization,d.qualification,d.experience
                FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.department_id=%s''', (did,))
            return jsonify(c.fetchall())
    finally:
        cn.close()

# ── INQUIRIES ─────────────────────────────────
@app.route('/api/inquiries', methods=['POST'])
def add_inquiry():
    d = request.get_json() or {}
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute(
                "INSERT INTO inquiries (name,email,subject,message) VALUES (%s,%s,%s,%s)",
                (d.get('name'), d.get('email'), d.get('subject'), d.get('message'))
            )
        cn.commit()
        return jsonify({'message': 'Inquiry submitted!'}), 201
    finally:
        cn.close()

@app.route('/api/inquiries', methods=['GET'])
def get_inquiries():
    a = auth(request)
    if not a or a['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 401
    cn = db()
    try:
        with cn.cursor() as c:
            c.execute("SELECT * FROM inquiries ORDER BY created_at DESC")
            rows = c.fetchall()
        result = []
        for r in rows:
            if hasattr(r.get('created_at'), 'strftime'):
                r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M')
            result.append(r)
        return jsonify(result)
    finally:
        cn.close()

# ── MAIN ──────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("   eDoc HMS - MySQL Backend v3 FINAL")
    print("=" * 55)
    print("   Admin:   admin@edoc.com   / admin123")
    print("   Doctor:  rahul@edoc.com   / doctor123")
    print("   Patient: amit@edoc.com    / patient123")
    print("   API: http://localhost:5000")
    print("=" * 55)
    app.run(debug=True, host='0.0.0.0', port=5000)