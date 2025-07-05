// Google Calendar 설정 타입
export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
}

// 이벤트 생성을 위한 타입
export interface CalendarEventInput {
  title: string;
  description?: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string;   // ISO 8601 format
  location?: string;
  attendees?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[]; // RRULE format
  calendarId?: string;   // 특정 캘린더 ID, 기본값은 'primary'
}

// 이벤트 응답 타입
export interface CalendarEventOutput {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  htmlLink: string;
  status: string;
  created: string;
  updated: string;
}

// 캘린더 목록 타입
export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// 훈련 일정 템플릿 타입
export interface TrainingScheduleTemplate {
  phase: string; // '저충격유산소', '조깅도입', '연속달리기', '구조화운동', '마라톤훈련'
  daysSinceOperation: number;
  title: string;
  duration: number; // 분 단위
  activities: string[];
  notes: string;
  checkpoints: string[];
  isImportantMilestone?: boolean;
}

// 의료 일정 템플릿 타입
export interface MedicalScheduleTemplate {
  type: 'ultrasound' | 'consultation' | 'evaluation' | 'scan';
  daysSinceOperation: number;
  title: string;
  description: string;
  duration: number;
  location: string;
  isRequired: boolean;
  reminders: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
}

// 일괄 이벤트 생성 요청 타입
export interface BulkEventCreationRequest {
  operationDate: string; // 수술 날짜 (ISO 8601)
  currentDaysSinceOperation: number; // 현재 수술 후 일수
  trainingTime: string; // 'HH:MM' format (예: '07:00')
  trainingDuration: number; // 기본 훈련 시간 (분)
  location: {
    gym?: string;
    pool?: string;
    park?: string;
    hospital?: string;
  };
  calendarId?: string;
  includeWeekends: boolean;
  includeMedicalSchedule: boolean;
}

// API 응답 타입
export interface CalendarServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// OAuth2 인증 상태 타입
export interface AuthStatus {
  isAuthenticated: boolean;
  userEmail?: string;
  tokenExpiresAt?: string;
  scopes: string[];
}

// 이벤트 검색 필터 타입
export interface EventSearchFilter {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  query?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  eventId?: string; // 특정 이벤트 ID로 검색
}

// 캘린더 생성 요청 타입
export interface CreateCalendarRequest {
  summary: string; // 캘린더 이름
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// Google Calendar API 스키마 타입 (런타임에서 사용)
export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export type GoogleCalendar = any; 