# AI Pet Health Monitor & Vet Telemedicine Platform

This is the implementation of the AI Pet Health Monitor & Vet Telemedicine platform as per the FRS document.

## Architecture
- **Mobile App**: React Native (Expo) in `mobile/`
- **Backend API**: FastAPI (Python) in `backend/`
- **Admin Panel**: React web app in `frontend/`
- **Database**: PostgreSQL — schema in `database/init.sql`, managed by Alembic

## Setup

### Backend
1. cd backend
2. pip install -r requirements.txt
3. alembic upgrade head
4. uvicorn app.main:app --host 0.0.0.0 --port 8000

### Mobile
1. cd mobile
2. npm install
3. npm start

### Admin / Frontend
1. cd frontend
2. npm install
3. npm start

## Deployment
```bash
PORT=8000 docker compose -f docker-compose.prod.yml up --build
```

## Usage
- Mobile: Register, add pet, submit symptoms with photo, get AI triage.
- API: POST /api/v1/triage for triage.
- Admin: View metrics, tune thresholds.

Note: This is a basic implementation. Full features per FRS need expansion.