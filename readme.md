# eDoc — Hospital Management System
### BCA Final Year Project | Full-Stack Documentation

---

## PROJECT STRUCTURE

```
eDoc/
├── app.py                ← Flask Backend (main file)
├── requirements.txt      ← Python dependencies
├── edoc.db               ← SQLite database (auto-created)
│
├── index.html            ← Landing page
├── login.html / login.js ← Login page
├── register.html / register.js   ← Registration page
├── dashboard.html / dashboard.js ← Admin dashboard
├── doctors.html / doctors.js     ← Doctor management
├── schedule.html / schedule.js   ← Session management
├── appointment.html / appointment.js  ← Patient home
└── patient.html / patient.js     ← Patient management
```

---

## SETUP INSTRUCTIONS

### Step 1 – Install Python Packages
```bash
pip install -r requirements.txt
```

### Step 2 – Run the Backend
```bash
python app.py
```
Server starts at: **http://localhost:5000**

First run automatically creates `edoc.db` with these test accounts:

| Role    | Email              | Password   |
|---------|--------------------|------------|
| Admin   | admin@edoc.com     | admin123   |
| Doctor  | doctor@edoc.com    | doctor123  |
| Patient | patient@edoc.com   | patient123 |

### Step 3 – Open Frontend
Open `index.html` in your browser (or use Live Server in VS Code).

---

## DATABASE SCHEMA (ER Diagram Description)

```
┌──────────────────────┐         ┌───────────────────────────┐
│       USERS          │         │        DEPARTMENTS         │
│──────────────────────│         │───────────────────────────│
│ id (PK)              │         │ id (PK)                   │
│ name                 │         │ name                      │
│ email (UNIQUE)       │         └───────────────────────────┘
│ password_hash        │                      │ 1
│ role (admin/doctor/  │                      │
│       patient)       │                      │ N
│ phone                │         ┌────────────▼──────────────┐
│ created_at           │         │         DOCTORS            │
└──────────┬───────────┘         │───────────────────────────│
           │ 1                   │ id (PK)                   │
           │                     │ user_id (FK → users.id)   │
     ┌─────┴─────┐               │ name                      │
     │           │               │ email (UNIQUE)            │
     │ N         │ N             │ phone                     │
     ▼           ▼               │ specialization            │
┌─────────┐ ┌──────────┐        │ qualification             │
│PATIENTS │ │ DOCTORS  │──────┐  │ experience                │
│(linked) │ │ (linked) │      │  │ department_id (FK)        │
└────┬────┘ └──────────┘      │  └────────────┬──────────────┘
     │                        │               │ 1
     │ N                      │               │
     │                        │ N             │ N
     │               ┌────────▼──────┐        │
     │               │    SESSIONS   │◄───────┘
     │               │───────────────│
     │               │ id (PK)       │
     │               │ title         │
     │               │ doctor_id (FK)│
     │               │ scheduled_    │
     │               │   datetime    │
     │               │ max_bookings  │
     │               └───────┬───────┘
     │                       │ 1
     │                       │
     │ 1                     │ N
     └──────────┬────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │       APPOINTMENTS        │
    │───────────────────────────│
    │ id (PK)                   │
    │ patient_id (FK → patients)│
    │ session_id (FK → sessions)│
    │ status (upcoming/         │
    │         completed/        │
    │         cancelled)        │
    │ booked_at                 │
    │ UNIQUE(patient_id,        │
    │        session_id)        │← Prevents double-booking
    └───────────────────────────┘

    ┌───────────────────────────┐
    │       INQUIRIES           │
    │───────────────────────────│
    │ id (PK)                   │
    │ name                      │
    │ email                     │
    │ subject                   │
    │ message                   │
    │ status (pending/resolved) │
    │ created_at                │
    └───────────────────────────┘
```

---

## API FLOW DIAGRAM

```
┌──────────────┐   HTTP Request    ┌──────────────────────────┐
│   Frontend   │ ────────────────► │     Flask App (app.py)   │
│  (Browser)   │                   │──────────────────────────│
│              │ ◄──────────────── │  1. Receive request      │
│  login.js    │   JSON Response   │  2. Validate JWT token   │
│  dashboard.js│                   │  3. Sanitize input       │
│  patient.js  │                   │  4. Execute SQL query    │
│  etc.        │                   │  5. Return JSON response │
└──────────────┘                   └──────────────┬───────────┘
                                                  │
                                                  │ SQL
                                                  ▼
                                   ┌──────────────────────────┐
                                   │     SQLite Database      │
                                   │       (edoc.db)          │
                                   │                          │
                                   │  users / doctors /       │
                                   │  patients / sessions /   │
                                   │  appointments            │
                                   └──────────────────────────┘

COMPLETE REQUEST LIFECYCLE EXAMPLE — Booking an Appointment:

  Browser                  Flask                   SQLite
    │                        │                        │
    │── POST /api/appointments ──────────────────────►│
    │   { patient_id, session_id }                    │
    │                        │                        │
    │                        │── BEGIN TRANSACTION ──►│
    │                        │                        │
    │                        │── SELECT session ─────►│
    │                        │◄─ session data ─────── │
    │                        │                        │
    │                        │── COUNT bookings ─────►│
    │                        │◄─ count ────────────── │
    │                        │  (if count >= max → 409 Full)
    │                        │                        │
    │                        │── CHECK duplicate ────►│
    │                        │◄─ result ───────────── │
    │                        │  (if exists → 409 Double-book)
    │                        │                        │
    │                        │── INSERT appointment ─►│
    │                        │── COMMIT ─────────────►│
    │                        │                        │
    │◄── 201 { id, message } ─│                        │
```

---

## SECURITY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                            │
│                                                             │
│  Layer 1 – PASSWORD HASHING (Werkzeug)                      │
│  ────────────────────────────────────                       │
│  User registers → password is NEVER stored plain           │
│                                                             │
│  "password123"  ──► generate_password_hash() ──►           │
│  "pbkdf2:sha256:600000$xyz$abcdef123456..."                 │
│                                                             │
│  Login → check_password_hash(stored_hash, input) → True/False│
│                                                             │
│  Layer 2 – JWT TOKEN (PyJWT)                                │
│  ─────────────────────────────                              │
│                                                             │
│  POST /api/auth/login  ──► validate credentials             │
│                       ──► create_token(user_id, role)       │
│                       ──► return { token: "eyJhb..." }      │
│                                                             │
│  JWT payload: { user_id, role, exp: now+24h }               │
│  Signed with SECRET_KEY (server-side only)                  │
│                                                             │
│  Every protected API call:                                  │
│  Headers: { Authorization: "Bearer eyJhb..." }              │
│         ──► @token_required decorator decodes token         │
│         ──► stores user_id + role in Flask's g object       │
│         ──► if expired/invalid → 401 Unauthorized           │
│                                                             │
│  Layer 3 – INPUT SANITIZATION                               │
│  ─────────────────────────────                              │
│  sanitize() function strips: < > " ' % ; ( ) & +           │
│  Prevents: XSS, SQL Injection via string injection          │
│  SQLite parameterized queries (?) prevent SQL injection     │
│                                                             │
│  Layer 4 – ROLE-BASED ACCESS CONTROL                        │
│  ─────────────────────────────────────                      │
│  @token_required  → any logged-in user                      │
│  @admin_required  → admin only                              │
│  Role check in-route → admin/doctor for sensitive data      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPLETE API REFERENCE

### Authentication
| Method | Endpoint              | Auth? | Description         |
|--------|-----------------------|-------|---------------------|
| POST   | /api/auth/login       | No    | Login               |
| POST   | /api/auth/register    | No    | Register new user   |

### Dashboard
| Method | Endpoint              | Auth? | Description         |
|--------|-----------------------|-------|---------------------|
| GET    | /api/dashboard/stats  | Yes   | Get card stats      |

### Doctors
| Method | Endpoint              | Auth?        | Description         |
|--------|-----------------------|--------------|---------------------|
| GET    | /api/doctors          | Yes          | List all doctors    |
| GET    | /api/doctors/:id      | Yes          | Get one doctor      |
| PUT    | /api/doctors/:id      | Admin/Doctor | Update doctor       |
| DELETE | /api/doctors/:id      | Admin        | Remove doctor       |

### Patients
| Method | Endpoint              | Auth?        | Description         |
|--------|-----------------------|--------------|---------------------|
| GET    | /api/patients         | Admin/Doctor | List all patients   |
| GET    | /api/patients/:id     | Yes          | Get one patient     |
| DELETE | /api/patients/:id     | Admin        | Delete patient      |

### Sessions (Schedule)
| Method | Endpoint              | Auth?        | Description         |
|--------|-----------------------|--------------|---------------------|
| GET    | /api/sessions         | Yes          | List all sessions   |
| POST   | /api/sessions         | Admin/Doctor | Create session      |
| DELETE | /api/sessions/:id     | Admin/Doctor | Remove session      |

### Appointments
| Method | Endpoint              | Auth? | Description         |
|--------|-----------------------|-------|---------------------|
| GET    | /api/appointments     | Yes   | List appointments   |
| POST   | /api/appointments     | Yes   | Book appointment    |
| DELETE | /api/appointments/:id | Yes   | Cancel appointment  |

### Departments
| Method | Endpoint                          | Auth? | Description         |
|--------|-----------------------------------|-------|---------------------|
| GET    | /api/departments                  | Yes   | List departments    |
| GET    | /api/departments/:id/doctors      | Yes   | Doctors in dept.    |

### Inquiries
| Method | Endpoint              | Auth?  | Description         |
|--------|-----------------------|--------|---------------------|
| POST   | /api/inquiries        | No     | Submit inquiry      |
| GET    | /api/inquiries        | Admin  | List all inquiries  |

---

## DOUBLE-BOOKING PREVENTION LOGIC

```python
# ATOMIC TRANSACTION in create_appointment():

1. SELECT session WHERE id = session_id
   → If not found → 404

2. Check session datetime > now()
   → If past → 400

3. SELECT COUNT(*) FROM appointments
   WHERE session_id = ? AND status != 'cancelled'
   → If count >= max_bookings → 409 "Session is fully booked"

4. SELECT id FROM appointments
   WHERE patient_id = ? AND session_id = ?
   → If exists → 409 "You have already booked this session"

5. INSERT INTO appointments (patient_id, session_id)
   → UNIQUE(patient_id, session_id) constraint = database-level guard

6. COMMIT
```

---

## TESTING CREDENTIALS (Quick Start)

After running `python app.py`:

```
Admin Login:
  Email:    admin@edoc.com
  Password: admin123
  Access:   Full system access

Doctor Login:
  Email:    doctor@edoc.com
  Password: doctor123
  Access:   Sessions + Appointments

Patient Login:
  Email:    patient@edoc.com
  Password: patient123
  Access:   Own appointments only
```

---

*eDoc Hospital Management System — BCA Final Year Project*