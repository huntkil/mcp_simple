# MCP Simple 프로젝트 작업 정리 (2024-07-06)

## 1. 현재까지 작업한 내용 요약

- **Obsidian 볼트 경로 변경**
  - 테스트용 경로에서 실제 경로(`C:\Users\huntk\iCloudDrive\iCloud~md~obsidian\My Card`)로 변경
  - `config/server-config.json`의 `obsidian.vaultPath` 값 수정
- **서버 빌드 및 실행**
  - `npm run build` → `npm start`로 서버 실행
  - Google Calendar 연동 및 인증 정상 동작 확인
- **임시 브랜치 생성 및 커밋**
  - 기존 작업 내용이 마음에 들지 않아, `temp-workspace` 브랜치 생성 후 전체 작업 커밋 및 원격 저장소 푸시

## 2. 브랜치 작업 현황

- `feature/calendar-enhancements`: 기존 주요 작업 브랜치
- `temp-workspace`: 임시 작업 브랜치 (2024-07-06 기준 전체 작업 커밋, 원격 저장소에 푸시 완료)
  - 원격 저장소: https://github.com/huntkil/mcp_simple/tree/temp-workspace
- 필요시, `main` 또는 다른 브랜치로 체크아웃하여 새롭게 작업 가능

## 3. 환경설정 및 프로젝트 세팅

### 필수 환경
- Node.js 18 이상
- npm
- (Windows) PowerShell 또는 Git Bash 권장

### 주요 설정 파일
- `config/server-config.json`: 서버 및 Obsidian 볼트 경로, 기타 설정
- `config/credentials/google-calendar.json`: Google Calendar API 인증 정보
- `config/credentials/google-calendar-tokens.json`: 인증 토큰 (OAuth2 완료 후 자동 생성)

### 설치 및 실행 방법
```bash
# 1. 저장소 클론
$ git clone <repository-url>
$ cd mcp_simple

# 2. 의존성 설치
$ npm install

# 3. 환경설정
# - config/server-config.json에서 obsidian.vaultPath, port 등 확인/수정
# - config/credentials/google-calendar.json에 Google API 정보 입력

# 4. 빌드 및 실행
$ npm run build
$ npm start
```

### Google Calendar 인증
1. 서버 실행 후, 인증 URL 획득:
   ```bash
   curl http://localhost:8000/api/calendar/auth-url
   ```
2. 브라우저에서 URL 열고, Google 계정 인증 및 권한 승인
3. 인증 코드 입력 후 토큰 자동 저장

## 4. 다른 컴퓨터에서 이어서 작업하는 방법

1. 저장소를 클론하고 위 환경설정/실행 방법을 그대로 따라 진행
2. Obsidian 볼트 경로(`config/server-config.json`의 `vaultPath`)를 해당 컴퓨터의 실제 경로로 맞게 수정
3. Google Calendar 인증 정보(`config/credentials/google-calendar.json`)가 다를 경우 새로 인증 필요
4. 필요시, `temp-workspace` 브랜치로 체크아웃하여 동일한 작업 환경에서 이어서 작업 가능
   ```bash
   git checkout temp-workspace
   ```
5. 서버 실행 및 테스트는 README, USECASE.md, test-*.sh 파일 참고

## 5. 참고 및 주의사항
- 로그 파일: `logs/error.log`, `logs/combined.log`에서 서버 상태 및 에러 확인 가능
- Obsidian 볼트 경로는 각 컴퓨터 환경에 맞게 반드시 수정 필요
- Google API 인증 정보는 외부에 노출되지 않도록 주의
- 테스트 스크립트(`test-*.sh`, `test-*.ps1`)로 주요 기능 자동 테스트 가능

---

**최종 업데이트: 2024-07-06** 