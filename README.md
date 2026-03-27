# Association Website + Backend API

This repository contains:

- Static website pages (Arabic, RTL) in the project root.
- User portal page (`portal.html`) connected to a Django REST API.
- Backend API in `backend/` with JWT authentication and role-based access.
- Database design files in `database/`.

## Project Structure

- `index.html`, `about.html`, `activities.html`, `schools.html`, `news.html`, `library.html`, `gallery.html`, `contact.html`
- `portal.html`, `portal.js`, `styles.css`, `scripts.js`
- `assets/` (logo/background images)
- `backend/` (Django + DRF + JWT)
- `database/` (`schema.sql`, `ERD.md`)

## Run Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver
```

## Frontend Portal API Base

The portal uses `http://127.0.0.1:8000` by default.
You can change it from the portal settings UI.
