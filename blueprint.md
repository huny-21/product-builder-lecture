# Project Blueprint - Public Interest Foundation Management System

## Overview
이 프로젝트는 공익법인의 투명한 운영을 돕기 위한 관리 시스템입니다. 임원 관리, 기부금 관리, 사업 관리, 회무 관리 등의 기능을 제공합니다.

## Current Status
- **Backend**: FastAPI 기반 서버가 구축되어 있으며, `/api/board-members` 등의 엔드포인트가 정의되어 있습니다. 가상 환경(`venv`)을 통해 실행 중입니다.
- **Frontend**: React (Vite) 기반의 UI가 구축되어 있으며, 현재 임원 관리 기능은 클라이언트 측 메모리(`useState`)에서만 작동하고 있습니다.
- **Database**: SQLAlchemy와 PostgreSQL(또는 SQLite)을 사용하도록 구성되어 있으나, 실제 데이터베이스 연결 및 초기화 상태 확인이 필요합니다.

## Planned Changes (Current Task)
### 서버에 정보 저장 기능 구현
프런트엔드에서 입력한 임원 정보를 백엔드 서버에 영구적으로 저장하고 불러오는 기능을 구현합니다.

1. **Backend Check**: 
   - 데이터베이스 세션 및 테이블 생성 여부 확인.
   - CORS(Cross-Origin Resource Sharing) 설정 확인 (프런트엔드 5173 -> 백엔드 8000).
2. **Frontend Update**:
   - `ExecutiveManagement.tsx` 컴포넌트에서 `useEffect`를 사용하여 초기 로딩 시 서버에서 데이터를 가져오도록 수정.
   - `handleAddExecutive`, `handleSaveEdit` 함수에 `fetch` API를 사용하여 서버로 데이터를 전송하는 로직 추가.
3. **Integration Test**:
   - 데이터 추가/수정 후 페이지를 새로고침해도 데이터가 유지되는지 확인.

## Design & Styles
- Modern, clean UI with a professional color palette.
- Responsive layout using modern CSS features (Grid, Flexbox).
- Interactive components like modals and interactive tables.
