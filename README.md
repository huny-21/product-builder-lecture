# NPO-TrustOS

공익법인(NPO)을 위한 회계/세무/후원 통합 관리 시스템.

## Tech Stack
- Frontend: React (TypeScript) + Vite
- Backend: FastAPI (Python)
- DB: PostgreSQL

## Structure
- `backend/` FastAPI 서비스
- `frontend/` React 웹앱
- `docs/` 아키텍처/ERD/보안 문서

## Local Setup (Backend)
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

## Local Setup (Frontend)
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Notes
- DB 스키마와 무결성 규칙은 `docs/` 문서를 참고하세요.
- 실제 운영 환경에서는 KMS 기반 키관리와 감사 로그가 필수입니다.
