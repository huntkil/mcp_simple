# Google Calendar 연동 설정 가이드

## 🚀 개요

이 프로젝트에 Google Calendar 연동 기능이 추가되었습니다. ClariVein 시술 후 회복 훈련 일정을 자동으로 Google Calendar에 생성하고 관리할 수 있습니다.

## 📋 주요 기능

### 1️⃣ 자동 훈련 일정 생성
- 수술 후 12주간의 체계적인 훈련 일정 자동 생성
- 단계별 운동 프로그램 (저충격유산소 → 조깅도입 → 연속달리기 → 구조화운동 → 마라톤훈련)
- 의료 검진 일정 자동 추가 (초음파 검사, 상담 등)

### 2️⃣ 스마트 일정 관리
- 훈련 완료 표시 및 노트 추가
- 날짜별 훈련 일정 조회
- 개인 맞춤형 운동 장소 설정

### 3️⃣ 안전 관리
- 단계별 체크포인트 및 주의사항 포함
- 중요 마일스톤 표시
- 의료진 상담 알림 설정

## 🛠️ 설정 방법

### 1단계: Google Cloud Console 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 방문
   - 새 프로젝트 생성 또는 기존 프로젝트 선택

2. **Google Calendar API 활성화**
   ```bash
   APIs & Services → Library → Google Calendar API → Enable
   ```

3. **OAuth 2.0 클라이언트 ID 생성**
   ```bash
   APIs & Services → Credentials → Create Credentials → OAuth client ID
   ```
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:4000/auth/google/callback`

4. **클라이언트 ID와 Secret 복사**
   - Client ID와 Client Secret을 안전한 곳에 저장

### 2단계: 프로젝트 설정

1. **의존성 설치**
   ```bash
   npm install googleapis google-auth-library
   ```

2. **설정 파일 업데이트**
   `config/server-config.json` 파일의 `googleCalendar` 섹션을 업데이트:
   ```json
   {
     "googleCalendar": {
       "clientId": "YOUR_GOOGLE_CLIENT_ID",
       "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
       "redirectUri": "http://localhost:4000/auth/google/callback",
       "scopes": [
         "https://www.googleapis.com/auth/calendar",
         "https://www.googleapis.com/auth/calendar.events"
       ],
       "defaultCalendarName": "ClariVein 회복 훈련",
       "defaultTrainingTime": "07:00",
       "defaultLocations": {
         "gym": "헬스장",
         "pool": "수영장",
         "park": "공원",
         "hospital": "병원"
       }
     }
   }
   ```

3. **서버 빌드 및 시작**
   ```bash
   npm run build
   npm start
   ```

### 3단계: Google Calendar 인증

1. **인증 URL 생성**
   ```bash
   curl http://localhost:4000/api/calendar/auth/url
   ```

2. **브라우저에서 인증**
   - 반환된 URL을 브라우저에서 열기
   - Google 계정으로 로그인 및 권한 승인
   - 자동으로 콜백 URL로 리디렉션됨

3. **인증 상태 확인**
   ```bash
   curl http://localhost:4000/api/calendar/auth/status
   ```

## 🎯 사용 방법

### 1️⃣ ClariVein 훈련 일정 생성

**API 호출 예시:**
```bash
curl -X POST http://localhost:4000/api/calendar/training/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "operationDate": "2024-01-01",
    "currentDaysSinceOperation": 8,
    "trainingTime": "07:00",
    "trainingDuration": 60,
    "location": {
      "gym": "스포츠센터",
      "park": "한강공원",
      "hospital": "강남병원"
    },
    "includeWeekends": true,
    "includeMedicalSchedule": true
  }'
```

**파라미터 설명:**
- `operationDate`: 수술 날짜 (ISO 8601 형식)
- `currentDaysSinceOperation`: 현재 수술 후 일수
- `trainingTime`: 훈련 시간 (HH:MM 형식)
- `trainingDuration`: 기본 훈련 시간 (분)
- `location`: 운동 장소 설정
- `includeWeekends`: 주말 포함 여부
- `includeMedicalSchedule`: 의료 일정 포함 여부

### 2️⃣ 훈련 일정 조회

**특정 날짜 조회:**
```bash
curl http://localhost:4000/api/calendar/training/schedule/2024-01-15
```

**전체 이벤트 조회:**
```bash
curl "http://localhost:4000/api/calendar/events?timeMin=2024-01-01T00:00:00Z&timeMax=2024-03-31T23:59:59Z&query=ClariVein"
```

### 3️⃣ 훈련 완료 표시

```bash
curl -X PATCH http://localhost:4000/api/calendar/training/complete/EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "오늘 훈련 완료. 컨디션 좋음. 다음 단계 준비됨.",
    "calendarId": "primary"
  }'
```

### 4️⃣ 캘린더 관리

**새 캘린더 생성:**
```bash
curl -X POST http://localhost:4000/api/calendar/calendars \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "ClariVein 회복 훈련",
    "description": "하지정맥류 시술 후 마라톤 복귀 훈련 일정",
    "timeZone": "Asia/Seoul"
  }'
```

**캘린더 목록 조회:**
```bash
curl http://localhost:4000/api/calendar/calendars
```

## 📱 모바일 앱 연동

### Google Calendar 앱 설정

1. **동기화 확인**
   - Google Calendar 앱에서 계정 동기화 활성화
   - 새로 생성된 캘린더가 표시되는지 확인

2. **알림 설정**
   - 각 훈련 일정에 30분 전 알림 자동 설정
   - 의료 일정에 하루 전, 2시간 전 알림 설정

3. **위젯 활용**
   - 홈 화면에 Google Calendar 위젯 추가
   - 오늘의 훈련 일정 쉽게 확인

## 🔧 고급 설정

### 커스텀 훈련 템플릿

`src/services/calendar-training-service.ts`에서 훈련 템플릿을 수정할 수 있습니다:

```typescript
// 새로운 훈련 단계 추가
{
  phase: '고급마라톤',
  daysSinceOperation: 90,
  title: '고급 마라톤 훈련',
  duration: 120,
  activities: ['장거리 런 60분', '인터벌 훈련 30분'],
  notes: '고급 마라톤 훈련 시작',
  checkpoints: ['심박수 모니터링', '페이스 조절'],
  isImportantMilestone: true
}
```

### 환경별 설정

**개발 환경:**
```json
{
  "googleCalendar": {
    "redirectUri": "http://localhost:4000/auth/google/callback"
  }
}
```

**프로덕션 환경:**
```json
{
  "googleCalendar": {
    "redirectUri": "https://yourdomain.com/auth/google/callback"
  }
}
```

## 🔐 보안 고려사항

### 1️⃣ 토큰 관리
- Access Token과 Refresh Token은 안전하게 저장
- 토큰 만료 시 자동 갱신 처리
- 민감한 정보는 환경 변수 사용 권장

### 2️⃣ 권한 설정
- 최소 권한 원칙 적용
- 필요한 Google Calendar 권한만 요청
- 정기적인 권한 검토

### 3️⃣ 데이터 보호
- HTTPS 사용 필수 (프로덕션 환경)
- 개인 건강 정보 보호
- 로그에 민감한 정보 기록 금지

## 🐛 문제 해결

### 자주 발생하는 오류

1. **인증 실패**
   ```
   Error: AUTH_FAILED
   ```
   - Client ID와 Secret 확인
   - Redirect URI 정확성 확인
   - Google Cloud Console에서 API 활성화 확인

2. **토큰 만료**
   ```
   Error: TOKEN_EXPIRED
   ```
   - 자동 토큰 갱신 기능 활용
   - 필요시 재인증 수행

3. **권한 부족**
   ```
   Error: INSUFFICIENT_PERMISSIONS
   ```
   - Google Calendar 권한 재확인
   - 사용자 계정의 Calendar 접근 권한 확인

### 디버깅 방법

1. **로그 확인**
   ```bash
   tail -f logs/app.log
   ```

2. **API 테스트**
   ```bash
   # 헬스 체크
   curl http://localhost:4000/health
   
   # 인증 상태 확인
   curl http://localhost:4000/api/calendar/auth/status
   ```

3. **설정 검증**
   ```bash
   # 설정 파일 유효성 검사
   node -e "console.log(JSON.parse(require('fs').readFileSync('config/server-config.json', 'utf8')))"
   ```

## 🎉 성공 사례

### 실제 사용 시나리오

**상황**: 2024년 1월 1일 ClariVein 시술 받음, 현재 8일째

**설정**:
```json
{
  "operationDate": "2024-01-01",
  "currentDaysSinceOperation": 8,
  "trainingTime": "07:00",
  "location": {
    "gym": "롯데피트니스",
    "park": "올림픽공원",
    "hospital": "강남세브란스병원"
  }
}
```

**결과**:
- 76일간의 체계적인 훈련 일정 자동 생성
- 4회의 의료 검진 일정 자동 추가
- 각 단계별 안전 체크포인트 포함
- 모바일에서 실시간 알림 수신

## 📞 지원

문제가 발생하거나 추가 기능이 필요한 경우:
1. GitHub Issues 등록
2. 로그 파일 첨부
3. 설정 파일 내용 공유 (민감한 정보 제외)

---

**⚠️ 주의사항**: 이 시스템은 의료 조언을 대체하지 않습니다. 모든 운동 계획은 담당 의료진과 상의 후 진행하시기 바랍니다. 