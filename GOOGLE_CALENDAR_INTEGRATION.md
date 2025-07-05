# 🗓️ Google Calendar 연동 기능 구현 완료

## ✅ 구현된 기능

### 1️⃣ 핵심 컴포넌트
- **GoogleCalendarConnector**: Google Calendar API 연동 클래스
- **CalendarTrainingService**: ClariVein 훈련 일정 관리 서비스
- **Calendar Routes**: REST API 엔드포인트 제공
- **Type Definitions**: TypeScript 타입 정의

### 2️⃣ 주요 기능
- **자동 훈련 일정 생성**: 수술 후 12주간 체계적 훈련 일정
- **의료 검진 일정**: 초음파 검사, 상담 등 의료 일정 자동 추가
- **단계별 운동 프로그램**: 저충격유산소 → 마라톤훈련 5단계
- **스마트 알림**: 각 단계별 맞춤 알림 설정
- **진행 상황 추적**: 훈련 완료 표시 및 노트 추가

### 3️⃣ API 엔드포인트
```
POST /api/calendar/training/schedule - 훈련 일정 생성
GET  /api/calendar/training/schedule/:date - 특정 날짜 일정 조회
PATCH /api/calendar/training/complete/:eventId - 훈련 완료 표시
GET  /api/calendar/auth/url - 인증 URL 생성
GET  /api/calendar/auth/status - 인증 상태 확인
GET  /api/calendar/calendars - 캘린더 목록 조회
POST /api/calendar/calendars - 새 캘린더 생성
```

## 🚀 빠른 시작 가이드

### 1단계: 설정 파일 업데이트
`config/server-config.json`에 Google Calendar 설정 추가:
```json
{
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

### 2단계: 의존성 설치
```bash
npm install googleapis google-auth-library
```

### 3단계: 프로젝트 빌드
```bash
npm run build
npm start
```

### 4단계: Google Calendar 인증
1. 인증 URL 생성: `GET /api/calendar/auth/url`
2. 브라우저에서 인증 진행
3. 인증 상태 확인: `GET /api/calendar/auth/status`

### 5단계: 훈련 일정 생성
```bash
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

## 📋 훈련 일정 템플릿

### 1-2주차: 저충격 유산소
- 고정식 자전거, 걷기, 상체 운동
- 압박 스타킹 착용 필수
- 종아리 상태 지속 모니터링

### 3-4주차: 조깅 도입
- 첫 조깅 시도 (5분 간격)
- 점진적 강도 증가
- 압박 슬리브 착용

### 5-6주차: 연속 달리기
- 30분 연속 조깅 목표
- 장거리 지구력 향상
- 정기적 상태 점검

### 7-8주차: 구조화된 운동
- 40분 연속 달리기
- 고강도 운동 적응
- 마라톤 훈련 준비

### 9-12주차: 마라톤 훈련
- 본격적인 마라톤 훈련
- 템포 런, 인터벌 훈련
- 최종 의료진 승인

## 🔧 커스터마이징

### 훈련 템플릿 수정
`src/services/calendar-training-service.ts`에서 훈련 내용 수정 가능:
```typescript
{
  phase: '저충격유산소',
  daysSinceOperation: 8,
  title: 'ClariVein 회복 - 저충격 유산소 시작',
  duration: 60,
  activities: ['고정식 자전거 15분', '상체 스트레칭 10분'],
  notes: '첫 운동 재개, 무리하지 말고 몸 상태 확인',
  checkpoints: ['압박 스타킹 착용', '종아리 압통 체크']
}
```

### 의료 일정 설정
```typescript
{
  type: 'ultrasound',
  daysSinceOperation: 14,
  title: '초음파 검사',
  description: '2주차 완료 후 초음파 검사로 정맥 폐쇄 상태 확인',
  reminders: [
    { method: 'popup', minutes: 1440 }, // 하루 전
    { method: 'popup', minutes: 120 }   // 2시간 전
  ]
}
```

## 📱 모바일 연동

### Google Calendar 앱
- 자동 동기화로 모든 기기에서 일정 확인
- 훈련 30분 전 알림 자동 설정
- 의료 일정 하루 전 알림

### 위젯 활용
- 홈 화면 위젯으로 오늘의 훈련 일정 확인
- 빠른 완료 체크 및 노트 추가

## 🔐 보안 고려사항

### 토큰 관리
- Access Token과 Refresh Token 안전 저장
- 자동 토큰 갱신 처리
- 환경 변수 사용 권장

### 데이터 보호
- 개인 건강 정보 암호화
- HTTPS 사용 필수 (프로덕션)
- 최소 권한 원칙 적용

## 📊 실제 사용 예시

### 현재 상황: 수술 후 8일째
**생성되는 일정:**
- 즉시 시작 가능한 저충격 유산소 운동
- 2주 후 초음파 검사 예약
- 4주 후 의료진 상담 예약
- 단계별 76개 훈련 일정 자동 생성

### 스마트 알림 시스템
- 훈련 30분 전: "오늘의 ClariVein 회복 훈련 준비하세요"
- 의료 일정 하루 전: "내일 초음파 검사 예약이 있습니다"
- 마일스톤 달성 시: "2주차 완료! 다음 단계 준비됨"

## 🎯 향후 개선 사항

### 1️⃣ AI 기반 개인화
- 개인 회복 속도에 따른 일정 자동 조정
- 운동 강도 스마트 추천
- 컨디션 기반 일정 최적화

### 2️⃣ 웨어러블 연동
- Apple Watch, Fitbit 연동
- 실시간 심박수 모니터링
- 운동 강도 자동 조절

### 3️⃣ 의료진 대시보드
- 환자 진행 상황 실시간 모니터링
- 원격 상담 일정 관리
- 회복 데이터 분석 리포트

## 🚨 주의사항

### 의료 면책
- 이 시스템은 의료 조언을 대체하지 않습니다
- 모든 운동 계획은 담당 의료진과 상의 필수
- 이상 증상 발생 시 즉시 의료진 상담

### 안전 수칙
- 각 단계별 체크포인트 필수 확인
- 무리한 운동 금지
- 압박 착용 상태 지속 모니터링

---

**✨ 이제 ClariVein 시술 후 체계적인 마라톤 복귀가 가능합니다!**

Google Calendar와 연동된 스마트 훈련 시스템으로 안전하고 효과적인 회복 과정을 경험하세요. 