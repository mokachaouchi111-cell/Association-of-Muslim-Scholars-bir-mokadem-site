# Backend API (Django + DRF + JWT)

## Quick Start

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver
```

## Auth Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`

## Core Endpoints

- `GET /api/dashboard/student/`
- `/api/student-profiles/`
- `/api/class-groups/`
- `/api/enrollments/`
- `/api/attendance-sessions/`
- `/api/attendance-records/`
- `/api/wird-logs/`
- `/api/assessments/`
- `/api/rewards/`
- `/api/courses/`

## Roles

- `student`
- `teacher`
- `admin`
- `guardian`

Role enforcement is handled in API permissions.
