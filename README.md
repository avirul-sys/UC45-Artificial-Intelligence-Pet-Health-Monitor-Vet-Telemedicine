# UC45 — Artificial Intelligence Pet Health Monitor & Vet Telemedicine Platform

This is the implementation of UC45 as per the FRS document.

## Architecture
- **Mobile App**: React Native (Expo) in `mobile/`
- **Backend API**: FastAPI (Python) in `backend/`
- **Admin Panel**: React web app in `admin/`

## Setup

### Backend
1. cd backend
2. pip install -r requirements.txt
3. python app/main.py

### Mobile
1. cd mobile
2. npm install
3. npm start

### Admin
1. cd admin
2. npm install
3. npm start

## Deployment
Use docker-compose.prod.yml (not implemented yet).

## Usage
- Mobile: Register, add pet, submit symptoms with photo, get AI triage.
- API: POST /api/v1/triage for triage.
- Admin: View metrics, tune thresholds.

Note: This is a basic implementation. Full features per FRS need expansion.