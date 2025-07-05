# MCP Simple 프로젝트 전체 정리 (업데이트됨)

## 프로젝트 개요

이 프로젝트는 MCP(Model Context Protocol) 서버로, **Obsidian 노트 관리**와 **Google Calendar 연동**을 제공하는 Node.js/TypeScript 애플리케이션입니다.

---

## 주요 기능

### 1. Obsidian 연동
- 노트 스캔 및 파싱
- 실시간 파일 감시
- 검색 및 필터링
- 노트 CRUD 작업

### 2. Google Calendar 연동
- OAuth2 인증
- 이벤트 생성/조회/수정/삭제
- 토큰 영속화

---

## 기술 스택

- **Backend**: Node.js, TypeScript, Express
- **Database**: 파일 기반 (JSON)
- **Authentication**: Google OAuth2
- **File Watching**: Chokidar
- **Logging**: Winston

---

## 프로젝트 구조

```
mcp_simple/
├── config/
│   ├── server-config.json
│   └── credentials/
│       ├── google-calendar.json
│       └── google-calendar-tokens.json
├── src/
│   ├── connectors/
│   │   ├── obsidian-connector.ts
│   │   └── google-calendar-connector.ts
│   ├── server/
│   │   ├── mcp-server.ts
│   │   ├── google-calendar-demo.ts
│   │   ├── message-handler.ts
│   │   └── protocol-handler.ts
│   ├── services/
│   │   ├── ai-service.ts
│   │   └── search-service.ts
│   ├── types/
│   │   ├── mcp-types.ts
│   │   ├── obsidian-types.ts
│   │   └── google-calendar-types.ts
│   └── utils/
│       ├── logger.ts
│       ├── file-watcher.ts
│       └── markdown-parser.ts
├── package.json
└── tsconfig.json
```

---

## 설정 파일

### server-config.json
```json
{
  "server": {
    "port": 8000,
    "host": "localhost",
    "logLevel": "info"
  },
  "obsidian": {
    "vaultPath": "C:\\Users\\huntk\\Documents\\ObsidianVault",
    "watchForChanges": true
  },
  "googleCalendar": {
    "clientId": "FROM_CREDENTIALS_FILE",
    "clientSecret": "FROM_CREDENTIALS_FILE",
    "redirectUri": "FROM_CREDENTIALS_FILE"
  }
}
```

### google-calendar.json
```json
{
  "clientId": "[REDACTED]",
  "clientSecret": "[REDACTED]",
  "redirectUri": "http://localhost:8000/api/calendar/auth/callback"
}
```

---

## API 엔드포인트

- `POST /mcp` - MCP 프로토콜 메시지 처리
- `GET /api/calendar/status` - 연동 상태 확인
- `GET /api/calendar/auth-url` - OAuth 인증 URL 생성
- `GET /api/calendar/auth/callback` - OAuth 콜백 처리
- `GET /api/calendar/events/today` - 오늘 일정 조회
- `POST /api/calendar/create-events` - ClariVein 이벤트 일괄 생성
- `DELETE /api/calendar/delete-clarivein-events` - ClariVein 이벤트 삭제
- `GET /health` - 서버 상태 확인

---

## 개발 환경 설정

1. 의존성 설치  
   `npm install`
2. TypeScript 컴파일  
   `npm run build`
3. 서버 실행  
   `npm start`
4. 개발 모드  
   `npm run dev`

---

## 주요 업데이트 내역 (2025-07-05 기준)

1. **MongoDB 제거 및 파일 기반 전환**  
   - MongoDB 관련 코드/설정/의존성 완전 삭제
2. **Obsidian 연동 개선**  
   - vault 경로 설정, 샘플 노트 생성, 실시간 감시 활성화
3. **포트 충돌 해결**  
   - 포트 8000으로 통일, redirect URI 및 문서 일치
4. **API 테스트 자동화**  
   - PowerShell 스크립트로 MCP 메서드 검증
5. **Google Calendar 연동 구현**  
   - OAuth2 인증, 토큰 영속화, 오늘 일정 조회 API 추가
6. **토큰 관리 개선**  
   - 토큰 파일 자동 저장/로드, 재시작 시 자동 인증
7. **일정 조회 기능 추가**  
   - `/api/calendar/events/today`로 오늘 일정 JSON 응답

---

## 사용법

- 서버 시작:  
  `npm run build && npm start`
- Google Calendar 인증:  
  `Invoke-RestMethod http://localhost:8000/api/calendar/auth-url`  
  (브라우저에서 URL 열고 권한 승인)
- 오늘 일정 조회:  
  `Invoke-RestMethod http://localhost:8000/api/calendar/events/today`
- 상태 확인:  
  `Invoke-RestMethod http://localhost:8000/api/calendar/status`
- 노트 검색/조회:  
  `Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body '{...}'`

---

## 문제 해결

- 포트 충돌:  
  `taskkill /IM node.exe /F`
- 빌드 오류:  
  `npm run build`
- 토큰 만료:  
  `Remove-Item config/credentials/google-calendar-tokens.json` 후 재인증

---

## 향후 개선 사항

- 프론트엔드 UI (React/Vue.js)
- 데이터베이스 연동 (SQLite/PostgreSQL)
- 보안 강화 (JWT, HTTPS)
- 모니터링/배포 (Docker 등)

---

## 참고 자료

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Google Calendar API](https://developers.google.com/calendar)
- [Obsidian API](https://obsidian.md/)
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

**마지막 업데이트: 2025-07-05** 