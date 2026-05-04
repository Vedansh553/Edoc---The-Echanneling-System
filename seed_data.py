import pymysql
from werkzeug.security import generate_password_hash

DB = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'edoc_db',
    'charset': 'utf8mb4'
}

conn = pymysql.connect(**DB)
c = conn.cursor()

print("Purana data clean kar raha hoon...")
c.execute("DELETE FROM appointments")
c.execute("DELETE FROM sessions")
c.execute("DELETE FROM doctors")
c.execute("DELETE FROM users")
c.execute("ALTER TABLE users AUTO_INCREMENT = 1")
c.execute("ALTER TABLE doctors AUTO_INCREMENT = 1")

print("Users insert kar raha hoon...")

users = [
    ('Administrator',    'admin@edoc.com',      'admin123',   'admin',   '0000000000'),
    ('Dr. Rahul Sharma', 'rahul@edoc.com',      'doctor123',  'doctor',  '9876543210'),
    ('Dr. Priya Singh',  'priya@edoc.com',       'doctor123',  'doctor',  '9876543211'),
    ('Dr. Amit Verma',   'amit.doc@edoc.com',   'doctor123',  'doctor',  '9876543212'),
    ('Dr. Sneha Patel',  'sneha@edoc.com',       'doctor123',  'doctor',  '9876543213'),
    ('Dr. Vikram Rao',   'vikram@edoc.com',      'doctor123',  'doctor',  '9876543214'),
    ('Dr. Meera Joshi',  'meera@edoc.com',       'doctor123',  'doctor',  '9876543215'),
    ('Dr. Arjun Nair',   'arjun@edoc.com',       'doctor123',  'doctor',  '9876543216'),
    ('Dr. Kavita Desai', 'kavita@edoc.com',      'doctor123',  'doctor',  '9876543217'),
    ('Dr. Rohit Gupta',  'rohit@edoc.com',       'doctor123',  'doctor',  '9876543218'),
    ('Dr. Pooja Sharma', 'pooja@edoc.com',       'doctor123',  'doctor',  '9876543219'),
    ('Amit Kumar',       'amit@edoc.com',        'patient123', 'patient', '9123456781'),
    ('Sunita Devi',      'sunita@edoc.com',      'patient123', 'patient', '9123456782'),
    ('Ravi Shankar',     'ravi@edoc.com',        'patient123', 'patient', '9123456783'),
    ('Neha Agarwal',     'neha@edoc.com',        'patient123', 'patient', '9123456784'),
    ('Suresh Yadav',     'suresh@edoc.com',      'patient123', 'patient', '9123456785'),
    ('Priya Mehta',      'priya.p@edoc.com',     'patient123', 'patient', '9123456786'),
]

for name, email, pwd, role, phone in users:
    hashed = generate_password_hash(pwd)
    c.execute("INSERT INTO users (name,email,password,role,phone) VALUES (%s,%s,%s,%s,%s)",
              (name, email, hashed, role, phone))
    print(f"  ✓ {name} ({role})")

print("\nDoctors table mein add kar raha hoon...")

doctor_data = [
    ('rahul@edoc.com',      'Cardiology',            'MBBS MD',     8,  1),
    ('priya@edoc.com',      'Neurology',             'MBBS MD DM',  10, 2),
    ('amit.doc@edoc.com',   'Orthopedics',           'MBBS MS',     6,  3),
    ('sneha@edoc.com',      'Pediatrics',            'MBBS MD',     5,  4),
    ('vikram@edoc.com',     'Dermatology',           'MBBS DVD',    7,  5),
    ('meera@edoc.com',      'Ophthalmology',         'MBBS MS',     9,  8),
    ('arjun@edoc.com',      'General Medicine',      'MBBS',        4,  7),
    ('kavita@edoc.com',     'Accident and Emergency','MBBS MD',     12, 6),
    ('rohit@edoc.com',      'Cardiology',            'MBBS DM',     15, 1),
    ('pooja@edoc.com',      'Neurology',             'MBBS MD DM',  3,  2),
]

for email, spec, qual, exp, dept_id in doctor_data:
    c.execute("SELECT id FROM users WHERE email=%s", (email,))
    user = c.fetchone()
    if user:
        c.execute("INSERT INTO doctors (user_id,specialization,qualification,experience,department_id) VALUES (%s,%s,%s,%s,%s)",
                  (user[0], spec, qual, exp, dept_id))
        print(f"  ✓ Doctor profile: {email}")

print("\nSessions add kar raha hoon...")

session_data = [
    ('Cardiology Checkup',        2,  '2026-04-01 10:00:00', 10),
    ('Neurology Consultation',    3,  '2026-04-02 11:00:00', 8),
    ('Orthopedics OPD',           4,  '2026-04-03 09:00:00', 12),
    ('Pediatrics Checkup',        5,  '2026-04-04 10:30:00', 15),
    ('Dermatology OPD',           6,  '2026-04-05 14:00:00', 10),
    ('Eye Checkup',               7,  '2026-04-06 11:00:00', 8),
    ('General OPD',               8,  '2026-04-07 09:30:00', 20),
    ('Emergency Consultation',    9,  '2026-04-08 16:00:00', 5),
]

for title, doc_idx, dt, max_b in session_data:
    c.execute("SELECT id FROM doctors LIMIT %s,1", (doc_idx-2,))
    doc = c.fetchone()
    if doc:
        c.execute("INSERT INTO sessions (title,doctor_id,scheduled_datetime,max_bookings) VALUES (%s,%s,%s,%s)",
                  (title, doc[0], dt, max_b))
        print(f"  ✓ Session: {title}")

conn.commit()
conn.close()

print("\n" + "="*50)
print("  SEED COMPLETE!")
print("="*50)
print("  Admin:   admin@edoc.com   / admin123")
print("  Doctor:  rahul@edoc.com   / doctor123")
print("  Patient: amit@edoc.com    / patient123")
print("="*50)