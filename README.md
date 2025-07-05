# MCP Obsidian MongoDB Server

Windows 10 환경에서 Cursor AI IDE와 연동되는 MCP(Model Context Protocol) 서버입니다. 이 서버는 Obsidian 노트와 로컬 MongoDB를 연결하여 지식 관리 시스템을 구축합니다.

## 🚀 주요 기능

- **MCP 프로토콜 지원**: JSON-RPC 기반 통신으로 Cursor AI IDE와 완벽 연동
- **Obsidian 연동**: 마크다운 파일 읽기/쓰기, 메타데이터 추출, 실시간 동기화
- **MongoDB 연동**: CRUD 작업, 검색 최적화, 인덱싱
- **Google Calendar 연동**: ClariVein 시술 후 체계적인 훈련 일정 자동 생성 및 관리
- **통합 검색**: Obsidian 노트와 MongoDB 데이터 통합 검색
- **실시간 동기화**: 파일 변경 감지 및 자동 동기화
- **백링크 처리**: Obsidian 위키링크 기반 백링크 자동 생성

## 🛠 기술 스택

- **언어**: TypeScript/JavaScript (Node.js)
- **프레임워크**: Express.js
- **데이터베이스**: MongoDB
- **외부 API**: Google Calendar API
- **파일 감지**: Chokidar
- **마크다운 파싱**: Gray-matter, Remark
- **로깅**: Winston
- **프로토콜**: JSON-RPC (MCP)

## 📁 프로젝트 구조

```
mcp-obsidian-mongo-server/
├── src/
│   ├── server/                    # MCP 서버 메인 로직
│   │   ├── mcp-server.ts         # ✅ Express 서버 및 MCP 엔드포인트
│   │   ├── message-handler.ts    # ✅ MCP 메시지 처리
│   │   ├── protocol-handler.ts   # ✅ MCP 프로토콜 처리
│   │   └── calendar-routes.ts    # 🆕 Google Calendar API 라우터
│   ├── connectors/               # 외부 시스템 연동
│   │   ├── obsidian-connector.ts # ✅ Obsidian Vault 연동
│   │   ├── mongo-connector.ts    # ✅ MongoDB 연동
│   │   └── google-calendar-connector.ts # 🆕 Google Calendar 연동
│   ├── services/                 # 비즈니스 로직
│   │   ├── search-service.ts     # ✅ 통합 검색 서비스
│   │   ├── ai-service.ts         # ✅ AI 서비스
│   │   └── calendar-training-service.ts # 🆕 훈련 일정 관리 서비스
│   ├── types/                   # TypeScript 타입 정의
│   │   ├── mcp-types.ts         # ✅ MCP 프로토콜 타입
│   │   ├── obsidian-types.ts    # ✅ Obsidian 타입
│   │   ├── mongo-types.ts       # ✅ MongoDB 타입
│   │   └── google-calendar-types.ts # 🆕 Google Calendar 타입
│   └── utils/                   # 유틸리티 함수
│       ├── file-watcher.ts      # ✅ 파일 변경 감지
│       ├── markdown-parser.ts   # ✅ 마크다운 파싱
│       └── logger.ts            # ✅ 로깅 유틸리티
├── config/                      # 설정 파일
│   ├── server-config.json       # ✅ 서버 설정
│   └── database-config.json     # ✅ DB 설정
├── logs/                        # 로그 파일 (자동 생성)
├── dist/                        # 빌드 결과물 (자동 생성)
├── package.json                 # ✅ 의존성 및 스크립트
├── tsconfig.json                # ✅ TypeScript 설정
├── .gitignore                   # ✅ Git 제외 파일
└── README.md                    # 프로젝트 문서
```

## 🔧 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

> **Google Calendar 연동을 사용하려면 추가 의존성 설치:**
> ```bash
> npm install googleapis google-auth-library
> ```

### 2. 설정 파일 구성

`config/server-config.json` 파일에서 다음 설정을 확인/수정하세요:

```json
{
  "server": {
    "port": 4000,
    "host": "localhost",
    "logLevel": "info"
  },
  "obsidian": {
    "vaultPath": "/path/to/your/obsidian/vault",
    "watchForChanges": true,
    "ignorePatterns": [
      ".obsidian/**",
      "*.temp",
      "*.tmp",
      "*.log"
    ],
    "includeAttachments": false,
    "maxFileSize": 10485760
  },
  "mongodb": {
    "connectionString": "mongodb://localhost:27017",
    "databaseName": "obsidian_mcp",
    "collections": {
      "notes": "notes",
      "metadata": "metadata",
      "searchIndex": "search_index"
    }
  },
  "googleCalendar": {
    "clientId": "YOUR_GOOGLE_CLIENT_ID",
    "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
    "redirectUri": "http://localhost:4000/auth/google/callback",
    "defaultTrainingTime": "07:00",
    "defaultLocations": {
      "gym": "헬스장",
      "park": "공원",
      "hospital": "병원"
    }
  }
}
```

### 3. 개발 모드 실행

```bash
npm run dev
```

### 4. 프로덕션 빌드 및 실행

```bash
# TypeScript 컴파일
npm run build

# 서버 시작
npm start
```

## 🌐 API 엔드포인트

### 헬스 체크
```bash
GET http://localhost:4000/health
```

### MCP 엔드포인트
```bash
POST http://localhost:4000/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

### Google Calendar API 엔드포인트
```bash
# 인증 URL 생성
GET http://localhost:4000/api/calendar/auth/url

# 훈련 일정 생성
POST http://localhost:4000/api/calendar/training/schedule
Content-Type: application/json

{
  "operationDate": "2024-01-01",
  "currentDaysSinceOperation": 8,
  "trainingTime": "07:00",
  "location": {
    "gym": "스포츠센터",
    "park": "한강공원", 
    "hospital": "강남병원"
  },
  "includeWeekends": true,
  "includeMedicalSchedule": true
}
```

## 📋 MCP 메서드

### 기본 메서드
- `initialize`: 서버 초기화 및 기능 목록 반환
- `shutdown`: 서버 종료
- `exit`: 프로세스 종료

### 커스텀 메서드 (구현 예정)
- `search_notes`: 통합 노트 검색
- `get_note`: 노트 조회
- `update_note`: 노트 업데이트
- `create_note`: 노트 생성
- `delete_note`: 노트 삭제
- `get_mongo_data`: MongoDB 데이터 조회
- `update_mongo_data`: MongoDB 데이터 업데이트

## 🔍 구현된 기능

### ✅ Obsidian Connector
- **Vault 스캔**: 재귀적 마크다운 파일 스캔
- **메타데이터 추출**: Frontmatter, 태그, 링크 파싱
- **실시간 감지**: 파일 추가/변경/삭제 자동 감지
- **백링크 처리**: 위키링크 기반 백링크 자동 생성
- **CRUD 작업**: 노트 생성, 읽기, 업데이트, 삭제
- **검색**: 제목, 태그, 콘텐츠, 메타데이터 기반 검색

### ✅ MongoDB Connector
- **연결 관리**: 연결 풀 및 재연결 처리
- **인덱싱**: 텍스트 검색, 태그, 동기화 인덱스
- **CRUD 작업**: 노트 저장/업데이트/삭제
- **검색**: 전문 검색 및 하이라이트
- **집계**: 복잡한 쿼리 및 통계
- **메타데이터**: 키-값 저장소
- **통계**: 노트 수, 태그 수, 평균 크기 등

### ✅ Search Service
- **하이브리드 검색**: Obsidian + MongoDB 통합 검색
- **결과 랭킹**: 관련성 점수 기반 정렬
- **필터링**: 소스별, 태그별, 날짜별 필터
- **스니펫**: 검색 결과 컨텍스트 추출

### ✅ File Watcher
- **실시간 감지**: Chokidar 기반 파일 시스템 감시
- **이벤트 처리**: 추가/변경/삭제 이벤트 콜백
- **성능 최적화**: 디바운싱 및 폴링 설정
- **에러 처리**: 파일 접근 오류 복구

### ✅ 로깅 시스템
- **다중 출력**: 콘솔 및 파일 로깅
- **레벨별 관리**: error, warn, info, debug
- **MCP 전용**: 요청/응답/에러 로깅
- **구조화**: JSON 형태 로그 저장

### 🆕 Google Calendar 연동
- **자동 훈련 일정**: ClariVein 시술 후 12주간 체계적 훈련 일정 생성
- **의료 검진 일정**: 초음파 검사, 상담 등 의료 일정 자동 추가
- **단계별 운동**: 저충격유산소 → 조깅도입 → 연속달리기 → 구조화운동 → 마라톤훈련
- **스마트 알림**: 훈련 30분 전, 의료 일정 하루 전 알림
- **진행 추적**: 훈련 완료 표시 및 노트 추가
- **OAuth2 인증**: Google 계정 연동 및 토큰 관리
- **모바일 동기화**: Google Calendar 앱과 자동 동기화

## 🧪 테스트

### 서버 상태 확인
```bash
curl -X GET http://localhost:4000/health
```

### MCP 초기화 테스트
```bash
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'
```

### Google Calendar 연동 테스트
```bash
# 1. 인증 URL 생성
curl -X GET http://localhost:4000/api/calendar/auth/url

# 2. 인증 상태 확인
curl -X GET http://localhost:4000/api/calendar/auth/status

# 3. 훈련 일정 생성 (인증 후)
curl -X POST http://localhost:4000/api/calendar/training/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "operationDate": "2024-01-01",
    "currentDaysSinceOperation": 8,
    "trainingTime": "07:00",
    "location": {
      "gym": "스포츠센터",
      "park": "한강공원",
      "hospital": "강남병원"
    },
    "includeWeekends": true,
    "includeMedicalSchedule": true
  }'
```

## 📊 로그

로그는 `logs/` 디렉토리에 저장됩니다:
- `combined.log`: 전체 로그
- `error.log`: 에러 로그만

로그 레벨은 `config/server-config.json`에서 설정할 수 있습니다.

## 🔧 개발 가이드

### 새로운 MCP 메서드 추가

1. `src/types/mcp-types.ts`에 메서드 타입 추가
2. `src/server/protocol-handler.ts`에 핸들러 구현
3. `registerMethodHandler`로 등록

### Obsidian 연동 확장

1. `src/connectors/obsidian-connector.ts` 수정
2. `src/types/obsidian-types.ts`에 타입 추가

### MongoDB 연동 확장

1. `src/connectors/mongo-connector.ts` 수정
2. `src/types/mongo-types.ts`에 타입 추가

## 🚨 주의사항

- **Obsidian Vault 경로**: 설정 파일에서 올바른 Obsidian Vault 경로를 지정해야 합니다
- **MongoDB 연결**: MongoDB 서버가 실행 중이어야 합니다
- **파일 권한**: Obsidian Vault 디렉토리에 읽기/쓰기 권한이 필요합니다
- **메모리 사용량**: 대용량 Vault의 경우 충분한 메모리를 확보하세요

## 🔄 다음 단계

- [ ] MCP 커스텀 메서드 구현
- [ ] Cursor AI IDE 연동 설정
- [ ] 성능 최적화
- [ ] 에러 처리 강화
- [ ] 테스트 코드 작성
- [ ] 문서화 완성

## 📄 라이선스

ISC

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다.

## 📖 사용 가이드

- **기본 사용법**: [USECASE.md](./USECASE.md) 파일을 참조하세요
- **Google Calendar 연동**: [GOOGLE_CALENDAR_INTEGRATION.md](./GOOGLE_CALENDAR_INTEGRATION.md) 파일을 참조하세요
- **상세 설정 가이드**: [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) 파일을 참조하세요

## 📞 지원

문제가 발생하면 GitHub Issues에 등록해 주세요. 