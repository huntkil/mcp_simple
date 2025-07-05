import express from 'express';
import { log } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// Google Calendar API 설정
let accessToken: string | null = null;
let refreshToken: string | null = null;

// 토큰 파일 경로 정의
const tokenFilePath = path.join(process.cwd(), 'config', 'credentials', 'google-calendar-tokens.json');

// 저장된 토큰을 로드합니다.
function loadTokensFromFile() {
  try {
    if (fs.existsSync(tokenFilePath)) {
      const raw = fs.readFileSync(tokenFilePath, 'utf-8');
      const saved = JSON.parse(raw);
      accessToken = saved.accessToken || saved.access_token || null;
      refreshToken = saved.refreshToken || saved.refresh_token || null;
      if (accessToken) {
        log.info('Loaded Google Calendar tokens from file');
      }
    }
  } catch (err) {
    log.warn('Failed to load Google Calendar tokens', err);
  }
}

// 토큰을 파일로 저장합니다.
function saveTokensToFile(tokens: any) {
  try {
    const data = {
      accessToken: tokens.access_token || tokens.accessToken,
      refreshToken: tokens.refresh_token || tokens.refreshToken,
      expiryDate: tokens.expiry_date || tokens.expiryDate
    };
    fs.writeFileSync(tokenFilePath, JSON.stringify(data, null, 2), 'utf-8');
    log.info('Saved Google Calendar tokens to file');
  } catch (err) {
    log.error('Failed to save Google Calendar tokens', err);
  }
}

// 모듈 로드 시 토큰을 읽어옵니다.
loadTokensFromFile();

// Google Calendar 설정 로드
function loadCalendarConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 먼저 credentials 파일에서 로드 시도
    const credentialsPath = path.join(process.cwd(), 'config', 'credentials', 'google-calendar.json');
    if (fs.existsSync(credentialsPath)) {
      const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);
      
      // server-config.json에서 추가 설정 로드
      const configPath = path.join(process.cwd(), 'config', 'server-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      return {
        ...config.googleCalendar,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        redirectUri: credentials.redirectUri
      };
    }
    
    // fallback: server-config.json에서 로드
    const configPath = path.join(process.cwd(), 'config', 'server-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.googleCalendar;
  } catch (error) {
    log.error('Failed to load calendar config', error);
    return null;
  }
}

// Google Calendar API 요청 함수
async function makeCalendarAPIRequest(endpoint: string, method: string = 'GET', data?: any) {
  if (!accessToken) {
    throw new Error('인증이 필요합니다. 먼저 OAuth 인증을 완료하세요.');
  }

  const fetch = require('node-fetch');
  const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
  
  const options: any = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API 오류: ${response.status} - ${errorText}`);
  }

  // DELETE 요청의 경우 응답 본문이 없으므로 빈 객체 반환
  if (method === 'DELETE') {
    return {};
  }

  return await response.json();
}

// 액세스 토큰 교환 함수
async function exchangeCodeForTokens(authCode: string) {
  const config = loadCalendarConfig();
  if (!config) {
    throw new Error('Google Calendar 설정이 없습니다.');
  }

  const fetch = require('node-fetch');
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const tokenData = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: authCode,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri
  };

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`토큰 교환 실패: ${response.status} - ${errorText}`);
  }

  const tokens = await response.json();
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  
  // 새로 발급받은 토큰을 파일에 저장합니다.
  saveTokensToFile(tokens);
  
  return tokens;
}

// Google Calendar 연동 상태 확인
router.get('/status', (req, res) => {
  const config = loadCalendarConfig();
  
  if (!config || !config.clientId || !config.clientSecret) {
    return res.json({
      success: false,
      message: 'Google Calendar가 설정되지 않았습니다.',
      configured: false
    });
  }

  res.json({
    success: true,
    message: 'Google Calendar 설정이 완료되었습니다.',
    configured: true,
    authenticated: !!accessToken,
    clientId: config.clientId.substring(0, 20) + '...',
    redirectUri: config.redirectUri
  });
});

// 인증 URL 생성 (간단 버전)
router.get('/auth-url', (req, res) => {
  const config = loadCalendarConfig();
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Google Calendar 설정이 필요합니다.'
    });
  }

  // Google OAuth2 인증 URL 생성
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(config.clientId)}&` +
    `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    'response_type=code&' +
    'access_type=offline&' +
    'prompt=consent';

  res.json({
    success: true,
    authUrl: authUrl,
    message: '이 URL을 브라우저에서 열어 Google Calendar 인증을 진행하세요.',
    instructions: [
      '1. 위 URL을 복사하여 브라우저에서 열기',
      '2. Google 계정으로 로그인',
      '3. Calendar 권한 승인',
      '4. 인증 코드 받기'
    ]
  });
});

// 인증 콜백 처리
router.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.json({
      success: false,
      error: `인증 오류: ${error}`,
      message: '인증이 취소되었거나 오류가 발생했습니다.'
    });
  }
  
  if (!code) {
    return res.json({
      success: false,
      error: '인증 코드가 없습니다.',
      message: '인증 과정에서 오류가 발생했습니다.'
    });
  }

  try {
    // 인증 코드를 액세스 토큰으로 교환
    const tokens = await exchangeCodeForTokens(code as string);
    
    res.json({
      success: true,
      message: '인증이 성공적으로 완료되었습니다!',
      authenticated: true,
      nextSteps: [
        '1. Google Calendar 인증이 완료되었습니다.',
        '2. 이제 ClariVein 훈련 일정을 Google Calendar에 직접 생성할 수 있습니다.',
        '3. POST /api/calendar/create-events 엔드포인트를 사용하세요.'
      ]
    });
  } catch (error) {
    log.error('Token exchange failed', error);
    res.status(500).json({
      success: false,
      error: '토큰 교환에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 오늘(현지 날짜 기준) 일정 조회
router.get('/events/today', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const calendarId = (req.query.calendarId as string) || 'primary';

    // 현지 시간(서버) 기준 오늘의 시작과 끝 ISO 문자열 계산
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

    const eventsResponse = await makeCalendarAPIRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`
    );

    res.json({
      success: true,
      data: eventsResponse.items || [],
      count: (eventsResponse.items || []).length
    });

  } catch (error) {
    log.error('Failed to fetch today events', error);
    res.status(500).json({
      success: false,
      error: '오늘 일정 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 일정 범위 검색 API
router.get('/events/range', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    // 쿼리 파라미터 파싱
    const {
      start = new Date().toISOString().split('T')[0], // 기본값: 오늘
      end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 기본값: 7일 후
      calendarId = 'primary',
      maxResults = '100',
      singleEvents = 'true',
      orderBy = 'startTime',
      q = '' // 검색어 (선택사항)
    } = req.query;

    // 날짜 유효성 검사
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '잘못된 날짜 형식입니다.',
        message: '날짜는 YYYY-MM-DD 형식으로 입력해주세요.'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: '시작 날짜가 종료 날짜보다 늦습니다.',
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.'
      });
    }

    // 시간 범위 설정 (시작일 00:00:00 ~ 종료일 23:59:59)
    const timeMin = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0).toISOString();
    const timeMax = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString();

    // API 요청 URL 구성
    const calendarIdStr = calendarId as string;
    let apiUrl = `/calendars/${encodeURIComponent(calendarIdStr)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=${singleEvents as string}&orderBy=${orderBy as string}&maxResults=${maxResults as string}`;
    
    // 검색어가 있으면 추가
    if (q && typeof q === 'string' && q.trim()) {
      apiUrl += `&q=${encodeURIComponent(q.trim())}`;
    }

    const eventsResponse = await makeCalendarAPIRequest(apiUrl);

    // 응답 데이터 정리
    const events = (eventsResponse.items || []).map((event: any) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      organizer: event.organizer,
      htmlLink: event.htmlLink,
      created: event.created,
      updated: event.updated,
      status: event.status,
      recurringEventId: event.recurringEventId,
      originalStartTime: event.originalStartTime
    }));

    res.json({
      success: true,
      count: events.length,
      data: events,
      query: {
        start: start as string,
        end: end as string,
        calendarId: calendarId as string,
        maxResults: parseInt(maxResults as string),
        searchQuery: typeof q === 'string' ? q : null
      },
      timeRange: {
        timeMin: timeMin,
        timeMax: timeMax
      }
    });

  } catch (error) {
    log.error('Failed to fetch events in range', error);
    res.status(500).json({
      success: false,
      error: '일정 범위 검색에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 기존 ClariVein 이벤트 삭제
router.delete('/delete-clarivein-events', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const { calendarId = 'primary' } = req.body;

    // ClariVein 관련 이벤트 검색
    const searchQuery = 'ClariVein';
    const timeMin = '2024-01-01T00:00:00Z';
    const timeMax = '2026-12-31T23:59:59Z';
    
    const eventsResponse = await makeCalendarAPIRequest(
      `/calendars/${calendarId}/events?q=${encodeURIComponent(searchQuery)}&timeMin=${timeMin}&timeMax=${timeMax}`
    );

    const deletedEvents = [];
    const errors = [];

    // 각 이벤트 삭제
    for (const event of eventsResponse.items || []) {
      try {
        await makeCalendarAPIRequest(`/calendars/${calendarId}/events/${event.id}`, 'DELETE');
        deletedEvents.push({
          title: event.summary,
          date: event.start?.dateTime || event.start?.date,
          eventId: event.id
        });
        log.info(`Deleted calendar event: ${event.summary}`);
      } catch (error) {
        log.error(`Failed to delete event: ${event.summary}`, error);
        errors.push({
          title: event.summary,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `${deletedEvents.length}개의 ClariVein 관련 일정이 삭제되었습니다.`,
      data: {
        deletedEvents: deletedEvents,
        errors: errors
      }
    });

  } catch (error) {
    log.error('Failed to delete ClariVein events', error);
    res.status(500).json({
      success: false,
      error: 'ClariVein 이벤트 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Google Calendar에 직접 이벤트 생성
router.post('/create-events', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const {
      operationDate = '2025-06-25', // 2025년 7월 3일 - 8일 = 2025년 6월 25일
      currentDaysSinceOperation = 8,
      trainingTime = '07:00',
      location = {},
      calendarId = 'primary'
    } = req.body;

    // 훈련 일정 템플릿 생성
    const scheduleTemplate = generateTrainingSchedule({
      operationDate,
      currentDaysSinceOperation,
      trainingTime,
      location: {
        gym: location.gym || '헬스장',
        park: location.park || '공원',
        hospital: location.hospital || '병원'
      }
    });

    const createdEvents = [];
    const errors = [];

    // 각 이벤트를 Google Calendar에 생성
    for (const event of scheduleTemplate.events) {
      try {
        const calendarEvent = {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: {
            dateTime: `${event.startDate}T${event.startTime}:00`,
            timeZone: 'Asia/Seoul'
          },
          end: {
            dateTime: `${event.startDate}T${event.endTime}:00`,
            timeZone: 'Asia/Seoul'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 }
            ]
          }
        };

        const result = await makeCalendarAPIRequest(`/calendars/${calendarId}/events`, 'POST', calendarEvent);
        createdEvents.push({
          title: event.title,
          date: event.startDate,
          googleEventId: result.id,
          htmlLink: result.htmlLink
        });

        log.info(`Created calendar event: ${event.title} on ${event.startDate}`);
      } catch (error) {
        log.error(`Failed to create event: ${event.title}`, error);
        errors.push({
          title: event.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `${createdEvents.length}개의 일정이 Google Calendar에 성공적으로 생성되었습니다!`,
      data: {
        totalEvents: scheduleTemplate.events.length,
        successfulEvents: createdEvents.length,
        failedEvents: errors.length,
        createdEvents: createdEvents,
        errors: errors,
        calendarLink: `https://calendar.google.com/calendar/u/0/r`
      }
    });

  } catch (error) {
    log.error('Failed to create calendar events', error);
    res.status(500).json({
      success: false,
      error: 'Google Calendar 이벤트 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 단일 일정 생성 API
router.post('/events/create', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const {
      summary,
      description = '',
      location = '',
      startDateTime,
      endDateTime,
      timeZone = 'Asia/Seoul',
      calendarId = 'primary',
      attendees = [],
      reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 }
        ]
      }
    } = req.body;

    // 필수 필드 검증
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.',
        message: 'summary, startDateTime, endDateTime은 필수입니다.',
        required: ['summary', 'startDateTime', 'endDateTime'],
        received: { summary, startDateTime, endDateTime }
      });
    }

    // 날짜 유효성 검사
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '잘못된 날짜 형식입니다.',
        message: 'startDateTime과 endDateTime은 유효한 ISO 8601 형식이어야 합니다.'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: '시작 시간이 종료 시간보다 늦거나 같습니다.',
        message: 'startDateTime은 endDateTime보다 이전이어야 합니다.'
      });
    }

    // Google Calendar 이벤트 객체 생성
    const calendarEvent: any = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone
      },
      reminders
    };

    // 참석자가 있으면 추가
    if (attendees && attendees.length > 0) {
      calendarEvent.attendees = attendees.map((email: string) => ({ email }));
    }

    // Google Calendar API 호출
    const result = await makeCalendarAPIRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, 'POST', calendarEvent);

    log.info(`Created single calendar event: ${summary}`);

    res.json({
      success: true,
      message: '일정이 성공적으로 생성되었습니다.',
      data: {
        eventId: result.id,
        summary: result.summary,
        description: result.description,
        location: result.location,
        start: result.start,
        end: result.end,
        htmlLink: result.htmlLink,
        created: result.created,
        updated: result.updated,
        status: result.status
      }
    });

  } catch (error) {
    log.error('Failed to create single event', error);
    res.status(500).json({
      success: false,
      error: '일정 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 일정 수정 API
router.put('/events/update/:eventId', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const { eventId } = req.params;
    const {
      summary,
      description,
      location,
      startDateTime,
      endDateTime,
      timeZone = 'Asia/Seoul',
      calendarId = 'primary',
      attendees,
      reminders
    } = req.body;

    // 이벤트 ID 검증
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: '이벤트 ID가 필요합니다.',
        message: 'URL 경로에 eventId를 포함해야 합니다.'
      });
    }

    // 업데이트할 필드만 포함하는 객체 생성
    const updateFields: any = {};

    if (summary !== undefined) updateFields.summary = summary;
    if (description !== undefined) updateFields.description = description;
    if (location !== undefined) updateFields.location = location;
    if (startDateTime !== undefined) {
      updateFields.start = { dateTime: startDateTime, timeZone };
    }
    if (endDateTime !== undefined) {
      updateFields.end = { dateTime: endDateTime, timeZone };
    }
    if (attendees !== undefined) updateFields.attendees = attendees;
    if (reminders !== undefined) updateFields.reminders = reminders;

    // 업데이트할 필드가 없으면 오류
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 필드가 없습니다.',
        message: '최소 하나의 필드를 업데이트해야 합니다.'
      });
    }

    // 날짜 유효성 검사 (startDateTime과 endDateTime이 모두 제공된 경우)
    if (startDateTime && endDateTime) {
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: '잘못된 날짜 형식입니다.',
          message: 'startDateTime과 endDateTime은 유효한 ISO 8601 형식이어야 합니다.'
        });
      }

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          error: '시작 시간이 종료 시간보다 늦거나 같습니다.',
          message: 'startDateTime은 endDateTime보다 이전이어야 합니다.'
        });
      }
    }

    // Google Calendar API 호출 (PATCH 메서드 사용)
    const result = await makeCalendarAPIRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      'PATCH',
      updateFields
    );

    log.info(`Updated calendar event: ${result.summary || eventId}`);

    res.json({
      success: true,
      message: '일정이 성공적으로 수정되었습니다.',
      data: {
        eventId: result.id,
        summary: result.summary,
        description: result.description,
        location: result.location,
        start: result.start,
        end: result.end,
        htmlLink: result.htmlLink,
        created: result.created,
        updated: result.updated,
        status: result.status
      }
    });

  } catch (error) {
    log.error('Failed to update event', error);
    res.status(500).json({
      success: false,
      error: '일정 수정에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 일정 삭제 API
router.delete('/events/delete/:eventId', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query;

    // 이벤트 ID 검증
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: '이벤트 ID가 필요합니다.',
        message: 'URL 경로에 eventId를 포함해야 합니다.'
      });
    }

    // Google Calendar API 호출
    await makeCalendarAPIRequest(
      `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(eventId)}`,
      'DELETE'
    );

    log.info(`Deleted calendar event: ${eventId}`);

    res.json({
      success: true,
      message: '일정이 성공적으로 삭제되었습니다.',
      data: {
        eventId: eventId,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    log.error('Failed to delete event', error);
    res.status(500).json({
      success: false,
      error: '일정 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ClariVein 훈련 일정 템플릿 생성
router.post('/create-schedule-template', (req, res) => {
  try {
    const {
      operationDate = '2025-06-25', // 2025년 7월 3일 - 8일 = 2025년 6월 25일
      currentDaysSinceOperation = 8,
      trainingTime = '07:00',
      location = {}
    } = req.body;

    // 훈련 일정 템플릿 생성
    const scheduleTemplate = generateTrainingSchedule({
      operationDate,
      currentDaysSinceOperation,
      trainingTime,
      location: {
        gym: location.gym || '헬스장',
        park: location.park || '공원',
        hospital: location.hospital || '병원'
      }
    });

    res.json({
      success: true,
      message: `${scheduleTemplate.events.length}개의 훈련 일정 템플릿이 생성되었습니다.`,
      data: {
        totalEvents: scheduleTemplate.events.length,
        trainingEvents: scheduleTemplate.trainingEvents,
        medicalEvents: scheduleTemplate.medicalEvents,
        schedule: scheduleTemplate.events,
        csvData: generateCSVData(scheduleTemplate.events),
        instructions: [
          '인증이 완료되었다면:',
          '• POST /api/calendar/create-events 를 사용해서 Google Calendar에 직접 생성',
          '또는 수동으로:',
          '• 아래 CSV 데이터를 복사하기',
          '• Google Calendar 웹사이트에서 "설정 > 가져오기 및 내보내기" 선택',
          '• CSV 파일로 저장 후 업로드'
        ]
      }
    });

  } catch (error) {
    log.error('Failed to create schedule template', error);
    res.status(500).json({
      success: false,
      error: '일정 템플릿 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 훈련 일정 생성 함수
function generateTrainingSchedule(params: any) {
  const { operationDate, currentDaysSinceOperation, trainingTime, location } = params;
  const events: any[] = [];
  let trainingEvents = 0;
  let medicalEvents = 0;

  // 훈련 템플릿
  const trainingTemplates = [
    // 1-2주차: 저충격 유산소
    {
      day: 8, phase: '저충격유산소', title: 'ClariVein 회복 - 저충격 유산소 시작',
      activities: ['고정식 자전거 15분', '상체 스트레칭 10분'], location: location.gym, duration: 60
    },
    {
      day: 9, phase: '저충격유산소', title: 'ClariVein 회복 - 걷기 + 자전거',
      activities: ['빠른 걷기 20분', '고정식 자전거 10분'], location: location.gym, duration: 60
    },
    {
      day: 10, phase: '저충격유산소', title: 'ClariVein 회복 - 일립티컬 도입',
      activities: ['일립티컬 15분', '상체 근력 운동 15분'], location: location.gym, duration: 60
    },
    {
      day: 14, phase: '저충격유산소', title: 'ClariVein 회복 - 2주차 마무리',
      activities: ['고정식 자전거 25분', '상체 근력 운동'], location: location.gym, duration: 60, milestone: true
    },
    // 3-4주차: 조깅 도입
    {
      day: 22, phase: '조깅도입', title: 'ClariVein 회복 - 첫 조깅 시도',
      activities: ['워밍업 걷기 10분', '조깅 5분 + 걷기 2분 (2회)'], location: location.park, duration: 60, milestone: true
    },
    {
      day: 28, phase: '조깅도입', title: 'ClariVein 회복 - 1개월 평가',
      activities: ['조깅 테스트 15분', '전반적 상태 점검'], location: location.park, duration: 60, milestone: true
    },
    // 5-6주차: 연속 달리기
    {
      day: 35, phase: '연속달리기', title: 'ClariVein 회복 - 장거리 테스트',
      activities: ['워밍업 걷기 10분', '연속 조깅 30분'], location: location.park, duration: 90, milestone: true
    },
    // 7-8주차: 구조화된 운동
    {
      day: 49, phase: '구조화운동', title: 'ClariVein 회복 - 장거리 런',
      activities: ['워밍업 조깅 10분', '연속 달리기 40분'], location: location.park, duration: 120, milestone: true
    },
    // 9-12주차: 마라톤 훈련
    {
      day: 57, phase: '마라톤훈련', title: '마라톤 훈련 - 본격 시작',
      activities: ['워밍업 조깅 15분', '템포 런 15분'], location: location.park, duration: 90, milestone: true
    },
    {
      day: 84, phase: '마라톤훈련', title: '마라톤 준비 - 최종 평가',
      activities: ['가벼운 조깅 30분', '전신 스트레칭 20분'], location: location.park, duration: 90, milestone: true
    }
  ];

  // 의료 일정 템플릿
  const medicalTemplates = [
    { day: 14, title: '초음파 검사', description: '2주차 정맥 폐쇄 상태 확인', location: location.hospital },
    { day: 28, title: '1개월 의료진 상담', description: '회복 상태 점검 및 다음 단계 계획', location: location.hospital },
    { day: 56, title: '8주차 상태 평가', description: '마라톤 훈련 시작 가능 여부 평가', location: location.hospital },
    { day: 84, title: '최종 듀플렉스 스캔', description: '마라톤 참가 전 최종 혈관 상태 확인', location: location.hospital }
  ];

  const baseDate = new Date(operationDate);

  // 훈련 일정 생성
  trainingTemplates.forEach(template => {
    if (template.day >= currentDaysSinceOperation) {
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + template.day);
      
      const [hours, minutes] = trainingTime.split(':');
      const startTime = new Date(eventDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + template.duration);

      events.push({
        title: template.title,
        description: `📅 수술 후 ${template.day}일째 - ${template.phase} 단계\n\n🏃‍♂️ 운동 내용:\n${template.activities.map(a => `• ${a}`).join('\n')}\n\n${template.milestone ? '⭐ 중요 마일스톤\n' : ''}⚠️ 안전 수칙: 몸 상태 변화 시 즉시 운동 중단`,
        startDate: startTime.toISOString().split('T')[0],
        startTime: startTime.toTimeString().split(' ')[0]?.substring(0, 5) || '07:00',
        endTime: endTime.toTimeString().split(' ')[0]?.substring(0, 5) || '08:00',
        location: template.location,
        type: 'training',
        phase: template.phase,
        day: template.day,
        milestone: template.milestone || false
      });
      trainingEvents++;
    }
  });

  // 의료 일정 생성
  medicalTemplates.forEach(template => {
    if (template.day >= currentDaysSinceOperation) {
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + template.day);
      
      const startTime = new Date(eventDate);
      startTime.setHours(14, 0, 0, 0); // 오후 2시
      
      const endTime = new Date(startTime);
      endTime.setHours(15, 0, 0, 0); // 1시간

      events.push({
        title: template.title,
        description: template.description,
        startDate: startTime.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        location: template.location,
        type: 'medical',
        day: template.day
      });
      medicalEvents++;
    }
  });

  // 날짜순 정렬
  events.sort((a, b) => a.day - b.day);

  return {
    events,
    trainingEvents,
    medicalEvents
  };
}

// CSV 데이터 생성
function generateCSVData(events: any[]) {
  const headers = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Description', 'Location'];
  const rows = events.map(event => [
    event.title,
    event.startDate,
    event.startTime,
    event.startDate,
    event.endTime,
    event.description.replace(/\n/g, ' '),
    event.location
  ]);

  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

// 특정 날짜의 일정 조회
router.get('/schedule/:date', (req, res) => {
  const { date } = req.params;
  
  // 간단한 예시 데이터
  const mockSchedule = {
    date: date,
    events: [
      {
        time: '07:00-08:00',
        title: 'ClariVein 회복 - 저충격 유산소',
        type: 'training',
        location: '헬스장',
        activities: ['고정식 자전거 15분', '상체 스트레칭 10분'],
        notes: '첫 운동 재개, 무리하지 말고 몸 상태 확인'
      }
    ]
  };

  res.json({
    success: true,
    data: mockSchedule
  });
});

// 기존 일정 삭제 후 새로운 일정 생성 (통합 엔드포인트)
router.post('/reset-and-create-events', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const {
      operationDate = '2025-06-25', // 2025년 7월 3일 - 8일 = 2025년 6월 25일
      currentDaysSinceOperation = 8,
      trainingTime = '07:00',
      location = {},
      calendarId = 'primary'
    } = req.body;

    // 1단계: 기존 ClariVein 이벤트 삭제
    log.info('기존 ClariVein 이벤트 삭제 시작...');
    const searchQuery = 'ClariVein';
    const timeMin = '2024-01-01T00:00:00Z';
    const timeMax = '2026-12-31T23:59:59Z';
    
    const eventsResponse = await makeCalendarAPIRequest(
      `/calendars/${calendarId}/events?q=${encodeURIComponent(searchQuery)}&timeMin=${timeMin}&timeMax=${timeMax}`
    );

    const deletedEvents = [];
    for (const event of eventsResponse.items || []) {
      try {
        await makeCalendarAPIRequest(`/calendars/${calendarId}/events/${event.id}`, 'DELETE');
        deletedEvents.push({
          title: event.summary,
          date: event.start?.dateTime || event.start?.date,
          eventId: event.id
        });
        log.info(`Deleted calendar event: ${event.summary}`);
      } catch (error) {
        log.error(`Failed to delete event: ${event.summary}`, error);
      }
    }

    // 2단계: 새로운 훈련 일정 생성
    log.info('새로운 훈련 일정 생성 시작...');
    const scheduleTemplate = generateTrainingSchedule({
      operationDate,
      currentDaysSinceOperation,
      trainingTime,
      location: {
        gym: location.gym || '헬스장',
        park: location.park || '공원',
        hospital: location.hospital || '병원'
      }
    });

    const createdEvents = [];
    const errors = [];

    // 각 이벤트를 Google Calendar에 생성
    for (const event of scheduleTemplate.events) {
      try {
        const calendarEvent = {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: {
            dateTime: `${event.startDate}T${event.startTime}:00`,
            timeZone: 'Asia/Seoul'
          },
          end: {
            dateTime: `${event.startDate}T${event.endTime}:00`,
            timeZone: 'Asia/Seoul'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 }
            ]
          }
        };

        const result = await makeCalendarAPIRequest(`/calendars/${calendarId}/events`, 'POST', calendarEvent);
        createdEvents.push({
          title: event.title,
          date: event.startDate,
          googleEventId: result.id,
          htmlLink: result.htmlLink
        });

        log.info(`Created calendar event: ${event.title} on ${event.startDate}`);
      } catch (error) {
        log.error(`Failed to create event: ${event.title}`, error);
        errors.push({
          title: event.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `기존 ${deletedEvents.length}개 일정을 삭제하고, 새로운 ${createdEvents.length}개 일정을 생성했습니다!`,
      data: {
        operationDate,
        currentDaysSinceOperation,
        deleted: {
          count: deletedEvents.length,
          events: deletedEvents
        },
        created: {
          totalEvents: scheduleTemplate.events.length,
          successfulEvents: createdEvents.length,
          failedEvents: errors.length,
          events: createdEvents,
          errors: errors
        },
        calendarLink: `https://calendar.google.com/calendar/u/0/r`,
        nextTrainingDate: createdEvents.length > 0 ? createdEvents[0].date : null
      }
    });

  } catch (error) {
    log.error('Failed to reset and create calendar events', error);
    res.status(500).json({
      success: false,
      error: '일정 재설정에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 캘린더 목록 조회 API
router.get('/calendars', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    // Google Calendar API 호출
    const calendarsResponse = await makeCalendarAPIRequest('/users/me/calendarList');

    // 캘린더 정보 정리
    const calendars = (calendarsResponse.items || []).map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      location: calendar.location,
      timeZone: calendar.timeZone,
      primary: calendar.primary || false,
      accessRole: calendar.accessRole,
      backgroundColor: calendar.backgroundColor,
      foregroundColor: calendar.foregroundColor,
      selected: calendar.selected,
      kind: calendar.kind,
      etag: calendar.etag
    }));

    // 기본 캘린더를 맨 앞으로 정렬
    const sortedCalendars = calendars.sort((a: any, b: any) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return a.summary.localeCompare(b.summary);
    });

    res.json({
      success: true,
      count: calendars.length,
      data: sortedCalendars,
      primaryCalendar: calendars.find((cal: any) => cal.primary) || null
    });

  } catch (error) {
    log.error('Failed to fetch calendars', error);
    res.status(500).json({
      success: false,
      error: '캘린더 목록 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 특정 캘린더 정보 조회 API
router.get('/calendars/:calendarId', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        message: '먼저 Google Calendar 인증을 완료하세요.'
      });
    }

    const { calendarId } = req.params;

    // 캘린더 ID 검증
    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: '캘린더 ID가 필요합니다.',
        message: 'URL 경로에 calendarId를 포함해야 합니다.'
      });
    }

    // Google Calendar API 호출
    const calendar = await makeCalendarAPIRequest(`/calendars/${encodeURIComponent(calendarId)}`);

    res.json({
      success: true,
      data: {
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        location: calendar.location,
        timeZone: calendar.timeZone,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor,
        kind: calendar.kind,
        etag: calendar.etag,
        conferenceProperties: calendar.conferenceProperties
      }
    });

  } catch (error) {
    log.error('Failed to fetch calendar', error);
    res.status(500).json({
      success: false,
      error: '캘린더 정보 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 