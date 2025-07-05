import { MCPRequest, MCPResponse, MCPError, MCPMethod } from '../types/mcp-types';
import { mcpLogger, log } from '../utils/logger';
import { ObsidianConnector, loadObsidianConfigFromFile } from '../connectors/obsidian-connector';
import { AIService } from '../services/ai-service';
import { SmartFeaturesService } from '../services/smart-features-service';
import { GoogleCalendarConnector } from '../connectors/google-calendar-connector';

// MCP 에러 코드 정의
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32000,
  SERVER_ERROR_END: -32099,
  SERVER_NOT_INITIALIZED: -32002,
  UNKNOWN_ERROR_CODE: -32001,
  REQUEST_CANCELLED: -32800,
  CONTENT_MODIFIED: -32801,
} as const;

// MCP 에러 생성 함수
export function createMCPError(code: number, message: string, data?: any): MCPError {
  return {
    code,
    message,
    data
  };
}

// MCP 응답 생성 함수
export function createMCPResponse(id: string | number | null, result?: any, error?: MCPError): MCPResponse {
  const response: MCPResponse = {
    jsonrpc: '2.0',
    id
  };
  
  if (result !== undefined) {
    response.result = result;
  }
  
  if (error !== undefined) {
    response.error = error;
  }
  
  return response;
}

// MCP 요청 검증 함수
export function validateMCPRequest(request: any): request is MCPRequest {
  return (
    request &&
    typeof request === 'object' &&
    request.jsonrpc === '2.0' &&
    typeof request.method === 'string' &&
    request.id !== undefined
  );
}

// MCP 메서드 핸들러 타입
export type MCPMethodHandler = (params: any) => Promise<any>;

// MCP 메서드 핸들러 맵
const methodHandlers = new Map<string, MCPMethodHandler>();

// 메서드 핸들러 등록 함수
export function registerMethodHandler(method: string, handler: MCPMethodHandler): void {
  methodHandlers.set(method, handler);
  log.info(`Registered MCP method handler: ${method}`);
}

// Google Calendar 설정 로드 함수
function loadGoogleCalendarConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../config/credentials/google-calendar.json');
    const tokenPath = path.join(__dirname, '../../config/credentials/google-calendar-tokens.json');

    let config: any = {};
    
    // 기본 설정 로드
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    }
    
    // 토큰 파일 로드 및 병합
    if (fs.existsSync(tokenPath)) {
      const tokenData = fs.readFileSync(tokenPath, 'utf8');
      const tokens = JSON.parse(tokenData);
      config = { ...config, ...tokens };
      log.info('Loaded Google Calendar tokens from file');
    }
    
    return config;
  } catch (error) {
    log.error('Failed to load Google Calendar config:', error);
  }
  
  // 기본 설정 반환
  return {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:8000/api/calendar/auth/callback'
  };
}

// 전역 Connector 인스턴스들 (초기화)
const obsidianConnector = new ObsidianConnector(loadObsidianConfigFromFile());
const aiService = new AIService();
const smartFeaturesService = new SmartFeaturesService();
const googleCalendarConnector = new GoogleCalendarConnector(loadGoogleCalendarConfig());

// 초기화 함수
async function initializeConnectors() {
  try {
    await obsidianConnector.initialize();
    log.info('All connectors initialized successfully');
  } catch (error) {
    log.error('Failed to initialize connectors:', error);
  }
}

// 초기화 실행
initializeConnectors();

// 기본 MCP 메서드 핸들러들
export async function handleInitialize(params: any): Promise<any> {
  mcpLogger.request(MCPMethod.INITIALIZE, params);
  
  // 서버 초기화 로직
  const capabilities = {
    textDocumentSync: 1, // Incremental
    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ['#', '[', ']', '`']
    },
    hoverProvider: true,
    definitionProvider: true,
    referencesProvider: true,
    documentSymbolProvider: true,
    workspaceSymbolProvider: true,
    codeActionProvider: true,
    documentFormattingProvider: true,
    documentRangeFormattingProvider: true,
    documentOnTypeFormattingProvider: {
      firstTriggerCharacter: '\n',
      moreTriggerCharacter: ['#', '*', '-', '>']
    },
    renameProvider: true,
    documentLinkProvider: {
      resolveProvider: true
    },
    executeCommandProvider: {
      commands: [
        'obsidian.createNote',
        'obsidian.updateNote',
        'obsidian.deleteNote'
      ]
    }
  };

  const result = {
    capabilities,
    serverInfo: {
      name: 'MCP Obsidian Server',
      version: '1.0.0'
    }
  };

  mcpLogger.response(MCPMethod.INITIALIZE, result);
  return result;
}

export async function handleShutdown(): Promise<any> {
  mcpLogger.request(MCPMethod.SHUTDOWN);
  
  // 서버 종료 로직
  // TODO: 리소스 정리, 연결 종료 등
  
  mcpLogger.response(MCPMethod.SHUTDOWN, null);
  return null;
}

export async function handleExit(): Promise<any> {
  mcpLogger.request(MCPMethod.EXIT);
  
  // 프로세스 종료
  process.exit(0);
}

// 전체 노트 리스트 조회 핸들러
export async function handleGetAllNotes(params: any): Promise<any> {
  const { limit, includeContent = false, sortBy = 'modifiedAt', sortOrder = 'desc' } = params || {};
  
  let notes = obsidianConnector.getAllNotes();
  
  // 정렬
  if (sortBy === 'title') {
    notes = notes.sort((a, b) => {
      const comparison = a.title.localeCompare(b.title);
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  } else if (sortBy === 'createdAt') {
    notes = notes.sort((a, b) => {
      const comparison = a.createdAt.getTime() - b.createdAt.getTime();
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  } else if (sortBy === 'modifiedAt') {
    notes = notes.sort((a, b) => {
      const comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  } else if (sortBy === 'size') {
    notes = notes.sort((a, b) => {
      const comparison = a.size - b.size;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  // 제한 적용
  if (limit && typeof limit === 'number') {
    notes = notes.slice(0, limit);
  }
  
  // 필요한 필드만 반환
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    fileName: note.fileName,
    path: note.path,
    tags: note.tags,
    size: note.size,
    createdAt: note.createdAt,
    modifiedAt: note.modifiedAt,
    content: includeContent ? note.content : undefined,
    frontmatter: note.frontmatter
  }));
}

// 최근 노트 조회 핸들러
export async function handleGetRecentNotes(params: any): Promise<any> {
  const { limit = 10 } = params || {};
  
  const notes = obsidianConnector.getRecentNotes(limit);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    modifiedAt: note.modifiedAt,
    size: note.size,
    tags: note.tags
  }));
}

// 노트 검색 핸들러 (Obsidian only)
export async function handleSearchNotes(params: any): Promise<any> {
  const { query, limit = 20, filters } = params;
  
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string');
  }

  // Obsidian 검색
  const obsidianResults = await obsidianConnector.searchNotes(query, limit);
  
  // 결과 변환
  const results = [];
  
  // Obsidian 결과 추가
  for (const result of obsidianResults) {
    results.push({
      type: 'obsidian',
      id: result.note.id,
      title: result.note.title,
      content: result.note.content.substring(0, 200) + '...',
      path: result.note.path,
      tags: result.note.tags,
      relevance: result.relevance,
      createdAt: result.note.createdAt,
      modifiedAt: result.note.modifiedAt
    });
  }
  
  // 관련성 순으로 정렬
  results.sort((a, b) => b.relevance - a.relevance);
  
  return results.slice(0, limit);
}

// 노트 조회 핸들러
export async function handleGetNote(params: any): Promise<any> {
  const { id, type = 'obsidian' } = params;
  
  if (!id) {
    throw new Error('Note ID is required');
  }
  
  if (type === 'obsidian') {
    const note = await obsidianConnector.getNote(id);
    if (!note) return null;
    
    return {
      type: 'obsidian',
      id: note.id,
      title: note.title,
      content: note.content,
      path: note.path,
      tags: note.tags,
      links: note.links,
      backlinks: note.backlinks,
      createdAt: note.createdAt,
      modifiedAt: note.modifiedAt,
      frontmatter: note.frontmatter
    };
  }
  
  throw new Error('Invalid type parameter. Must be "obsidian"');
}

// 노트 생성 핸들러
export async function handleCreateNote(params: any): Promise<any> {
  const { title, content, tags = [] } = params;
  
  if (!title || !content) {
    throw new Error('Title and content are required');
  }
  
  const note = await obsidianConnector.createNote(title, content, tags);
  
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    path: note.path,
    tags: note.tags,
    createdAt: note.createdAt,
    modifiedAt: note.modifiedAt
  };
}

// 노트 업데이트 핸들러
export async function handleUpdateNote(params: any): Promise<any> {
  const { id, updates } = params;
  
  if (!id || !updates) {
    throw new Error('Note ID and updates are required');
  }
  
  const updatedNote = await obsidianConnector.updateNote(id, updates);
  
  if (!updatedNote) {
    throw new Error('Note not found');
  }
  
  return {
    id: updatedNote.id,
    title: updatedNote.title,
    content: updatedNote.content,
    path: updatedNote.path,
    tags: updatedNote.tags,
    createdAt: updatedNote.createdAt,
    modifiedAt: updatedNote.modifiedAt
  };
}

// 노트 삭제 핸들러
export async function handleDeleteNote(params: any): Promise<any> {
  const { title, fileName } = params || {};
  
  if (!title && !fileName) {
    throw new Error('title 또는 fileName 중 하나는 필수입니다.');
  }
  
  try {
    const deleted = await obsidianConnector.deleteNote(title || fileName);
    
    if (!deleted) {
      throw new Error('노트 삭제에 실패했습니다.');
    }
    
    return {
      success: true,
      message: '노트가 성공적으로 삭제되었습니다.',
      note: {
        title: title || fileName,
        fileName: fileName || title,
        path: 'deleted'
      }
    };
  } catch (error) {
    throw new Error(`노트 삭제 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===== Phase 2: Obsidian ↔ Google Calendar 연동 메서드들 =====

// 일정 → 노트 변환 핸들러
export async function handleCalendarToNote(params: any): Promise<any> {
  const { eventId, title, template = 'default', calendarId = 'primary' } = params || {};
  
  if (!eventId) {
    throw new Error('eventId는 필수입니다.');
  }
  
  try {
    // Google Calendar API에서 이벤트 정보 가져오기
    const fetch = require('node-fetch');
    const fs = require('fs');
    const path = require('path');
    
    // 토큰 로드
    const tokenFilePath = path.join(process.cwd(), 'config', 'credentials', 'google-calendar-tokens.json');
    let accessToken = null;
    
    if (fs.existsSync(tokenFilePath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8'));
      accessToken = tokenData.accessToken;
    }
    
    if (!accessToken) {
      throw new Error('Google Calendar 인증이 필요합니다.');
    }
    
    // Google Calendar API 호출
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Calendar API 오류: ${response.status}`);
    }
    
    const event = await response.json();
    
    // 노트 제목 결정
    const noteTitle = title || event.summary || `일정_${eventId}`;
    
    // 템플릿에 따른 노트 내용 생성
    let noteContent = '';
    
    switch (template) {
      case 'meeting':
        noteContent = generateMeetingNoteContent(event);
        break;
      case 'appointment':
        noteContent = generateAppointmentNoteContent(event);
        break;
      case 'task':
        noteContent = generateTaskNoteContent(event);
        break;
      default:
        noteContent = generateDefaultNoteContent(event);
    }
    
    // Obsidian에 노트 생성
    const createdNote = await obsidianConnector.createNote(noteTitle, noteContent);
    
    return {
      success: true,
      message: '일정이 노트로 성공적으로 변환되었습니다.',
      data: {
        eventId: event.id,
        eventSummary: event.summary,
        noteTitle: createdNote.title,
        noteFileName: createdNote.fileName,
        notePath: createdNote.path,
        template: template
      }
    };
    
  } catch (error) {
    throw new Error(`일정 → 노트 변환 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 노트 → 일정 변환 핸들러
export async function handleNoteToCalendar(params: any): Promise<any> {
  const { noteTitle, calendarId = 'primary', parseMode = 'auto' } = params || {};
  
  if (!noteTitle) {
    throw new Error('noteTitle은 필수입니다.');
  }
  
  try {
    // Obsidian에서 노트 가져오기
    const note = await obsidianConnector.getNote(noteTitle);
    if (!note) {
      throw new Error(`노트를 찾을 수 없습니다: ${noteTitle}`);
    }
    
    // 노트 내용을 일정으로 파싱
    let eventData;
    
    if (parseMode === 'manual') {
      // 수동 파싱 모드 - 사용자가 제공한 데이터 사용
      eventData = params.eventData;
      if (!eventData || !eventData.summary || !eventData.startDateTime || !eventData.endDateTime) {
        throw new Error('수동 모드에서는 eventData(summary, startDateTime, endDateTime)가 필수입니다.');
      }
    } else {
      // 자동 파싱 모드 - 노트 내용에서 일정 정보 추출
      eventData = parseNoteToEvent(note.content, note.title);
    }
    
    // Google Calendar API 호출
    const fetch = require('node-fetch');
    const fs = require('fs');
    const path = require('path');
    
    // 토큰 로드
    const tokenFilePath = path.join(process.cwd(), 'config', 'credentials', 'google-calendar-tokens.json');
    let accessToken = null;
    
    if (fs.existsSync(tokenFilePath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8'));
      accessToken = tokenData.accessToken;
    }
    
    if (!accessToken) {
      throw new Error('Google Calendar 인증이 필요합니다.');
    }
    
    // Google Calendar에 이벤트 생성
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API 오류: ${response.status} - ${errorText}`);
    }
    
    const createdEvent = await response.json();
    
    return {
      success: true,
      message: '노트가 일정으로 성공적으로 변환되었습니다.',
      data: {
        noteTitle: note.title,
        eventId: createdEvent.id,
        eventSummary: createdEvent.summary,
        eventStart: createdEvent.start,
        eventEnd: createdEvent.end,
        htmlLink: createdEvent.htmlLink,
        parseMode: parseMode
      }
    };
    
  } catch (error) {
    throw new Error(`노트 → 일정 변환 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 일정 검색 핸들러
export async function handleSearchCalendarEvents(params: any): Promise<any> {
  const { query, startDate, endDate, maxResults = 10, calendarId = 'primary' } = params || {};
  
  try {
    const fetch = require('node-fetch');
    const fs = require('fs');
    const path = require('path');
    
    // 토큰 로드
    const tokenFilePath = path.join(process.cwd(), 'config', 'credentials', 'google-calendar-tokens.json');
    let accessToken = null;
    
    if (fs.existsSync(tokenFilePath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8'));
      accessToken = tokenData.accessToken;
    }
    
    if (!accessToken) {
      throw new Error('Google Calendar 인증이 필요합니다.');
    }
    
    // API URL 구성
    let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
    
    if (query) {
      apiUrl += `&q=${encodeURIComponent(query)}`;
    }
    
    if (startDate) {
      const timeMin = new Date(startDate).toISOString();
      apiUrl += `&timeMin=${timeMin}`;
    }
    
    if (endDate) {
      const timeMax = new Date(endDate).toISOString();
      apiUrl += `&timeMax=${timeMax}`;
    }
    
    // Google Calendar API 호출
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Calendar API 오류: ${response.status}`);
    }
    
    const eventsResponse = await response.json();
    
    return {
      success: true,
      count: eventsResponse.items?.length || 0,
      data: eventsResponse.items || [],
      query: {
        query: query || null,
        startDate: startDate || null,
        endDate: endDate || null,
        maxResults: maxResults,
        calendarId: calendarId
      }
    };
    
  } catch (error) {
    throw new Error(`일정 검색 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 양방향 동기화 핸들러
export async function handleSyncCalendarNote(params: any): Promise<any> {
  const { eventId, noteTitle, syncDirection = 'both', calendarId = 'primary' } = params || {};
  
  if (!eventId && !noteTitle) {
    throw new Error('eventId 또는 noteTitle 중 하나는 필수입니다.');
  }
  
  try {
    const results = {
      eventToNote: null,
      noteToEvent: null,
      syncDirection: syncDirection
    };
    
    // 일정 → 노트 동기화
    if (syncDirection === 'event-to-note' || syncDirection === 'both') {
      if (eventId) {
        const eventToNoteResult = await handleCalendarToNote({ eventId, calendarId });
        results.eventToNote = eventToNoteResult;
      }
    }
    
    // 노트 → 일정 동기화
    if (syncDirection === 'note-to-event' || syncDirection === 'both') {
      if (noteTitle) {
        const noteToEventResult = await handleNoteToCalendar({ noteTitle, calendarId });
        results.noteToEvent = noteToEventResult;
      }
    }
    
    return {
      success: true,
      message: '양방향 동기화가 완료되었습니다.',
      data: results
    };
    
  } catch (error) {
    throw new Error(`양방향 동기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===== 유틸리티 함수들 =====

// 노트 내용을 일정으로 파싱하는 함수
function parseNoteToEvent(noteContent: string, noteTitle: string): any {
  const lines = noteContent.split('\n');
  const eventData: any = {
    summary: noteTitle,
    description: '',
    location: '',
    start: { timeZone: 'Asia/Seoul' },
    end: { timeZone: 'Asia/Seoul' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 }
      ]
    }
  };
  
  // 날짜/시간 패턴 매칭
  const dateTimePatterns = [
    /날짜[:\s]*(\d{4}-\d{2}-\d{2})/,
    /시간[:\s]*(\d{2}:\d{2})/,
    /시작[:\s]*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
    /종료[:\s]*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
    /(\d{2}:\d{2})/
  ];
  
  let startDateTime = '';
  let endDateTime = '';
  let location = '';
  let description = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 위치 정보 추출
    if (trimmedLine.includes('위치') || trimmedLine.includes('장소')) {
      location = trimmedLine.replace(/^(위치|장소)[:\s]*/, '').trim();
    }
    
    // 날짜/시간 정보 추출
    for (const pattern of dateTimePatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        if (!startDateTime) {
          startDateTime = match[1];
        } else if (!endDateTime) {
          endDateTime = match[1];
        }
        break;
      }
    }
    
    // 설명 정보 수집
    if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-')) {
      description += trimmedLine + '\n';
    }
  }
  
  // 기본값 설정
  if (!startDateTime) {
    const now = new Date();
    startDateTime = now.toISOString().slice(0, 16).replace('T', ' ');
  }
  
  if (!endDateTime) {
    const startDate = new Date(startDateTime);
    startDate.setHours(startDate.getHours() + 1);
    endDateTime = startDate.toISOString().slice(0, 16).replace('T', ' ');
  }
  
  // ISO 형식으로 변환
  eventData.start.dateTime = new Date(startDateTime).toISOString();
  eventData.end.dateTime = new Date(endDateTime).toISOString();
  
  if (location) {
    eventData.location = location;
  }
  
  if (description.trim()) {
    eventData.description = description.trim();
  }
  
  return eventData;
}

// 회의 노트 템플릿 생성
function generateMeetingNoteContent(event: any): string {
  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString('ko-KR');
  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString('ko-KR');
  
  return `# ${event.summary}

## 📅 일정 정보
- **시작**: ${startTime}
- **종료**: ${endTime}
- **위치**: ${event.location || '미정'}
- **참석자**: ${event.attendees ? event.attendees.map((a: any) => a.email).join(', ') : '미정'}

## 📝 회의 내용
${event.description || '회의 내용을 여기에 작성하세요.'}

## ✅ 액션 아이템
- [ ] 

## 📋 다음 단계
- 

## 🔗 관련 링크
- [Google Calendar에서 보기](${event.htmlLink})

---
*이 노트는 Google Calendar 일정에서 자동 생성되었습니다.*
`;
}

// 약속 노트 템플릿 생성
function generateAppointmentNoteContent(event: any): string {
  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString('ko-KR');
  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString('ko-KR');
  
  return `# ${event.summary}

## 📅 약속 정보
- **날짜**: ${startTime}
- **시간**: ${startTime.split(' ')[1]} - ${endTime.split(' ')[1]}
- **위치**: ${event.location || '미정'}

## 📝 준비사항
${event.description || '준비사항을 여기에 작성하세요.'}

## ✅ 체크리스트
- [ ] 

## 📞 연락처
- 

## 🔗 관련 링크
- [Google Calendar에서 보기](${event.htmlLink})

---
*이 노트는 Google Calendar 일정에서 자동 생성되었습니다.*
`;
}

// 작업 노트 템플릿 생성
function generateTaskNoteContent(event: any): string {
  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString('ko-KR');
  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString('ko-KR');
  
  return `# ${event.summary}

## 📅 작업 정보
- **시작**: ${startTime}
- **마감**: ${endTime}
- **우선순위**: 

## 📝 작업 내용
${event.description || '작업 내용을 여기에 작성하세요.'}

## ✅ 작업 단계
- [ ] 

## 📋 참고 자료
- 

## 🔗 관련 링크
- [Google Calendar에서 보기](${event.htmlLink})

---
*이 노트는 Google Calendar 일정에서 자동 생성되었습니다.*
`;
}

// 기본 노트 템플릿 생성
function generateDefaultNoteContent(event: any): string {
  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString('ko-KR');
  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString('ko-KR');
  
  return `# ${event.summary}

## 📅 일정 정보
- **시작**: ${startTime}
- **종료**: ${endTime}
- **위치**: ${event.location || '미정'}

## 📝 상세 내용
${event.description || '상세 내용을 여기에 작성하세요.'}

## 🔗 관련 링크
- [Google Calendar에서 보기](${event.htmlLink})

---
*이 노트는 Google Calendar 일정에서 자동 생성되었습니다.*
`;
}

// ===== Phase 3: 스마트 기능 핸들러들 =====

/**
 * 이벤트 분류 - 제목과 설명을 기반으로 카테고리와 우선순위를 자동 분류
 */
export async function handleClassifyEvent(params: any): Promise<any> {
  const { eventId } = params || {};
  
  if (!eventId) {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'eventId is required');
  }

  try {
    // 캘린더 이벤트 조회
    const eventResponse = await googleCalendarConnector.getEvents({ eventId });
    if (!eventResponse.success || !eventResponse.data || eventResponse.data.length === 0) {
      throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, 'Failed to retrieve calendar event');
    }
    
    const event = eventResponse.data[0];
    
    // 이벤트 분류 수행
    const classification = await smartFeaturesService.classifyEvent(event);
    
    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime
      },
      classification
    };
  } catch (error) {
    log.error('MCP Error in classify_event:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `이벤트 분류 실패: ${error.message}`);
  }
}

/**
 * 충돌 감지 - 일정 간의 시간 충돌을 감지하고 해결 방안 제시
 */
export async function handleDetectConflicts(params: any): Promise<any> {
  const { startDate, endDate, calendarId = 'primary' } = params || {};
  
  if (!startDate || !endDate) {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'startDate and endDate are required');
  }

  try {
    // 지정된 기간의 모든 이벤트 조회
    const eventsResponse = await googleCalendarConnector.getEvents({
      calendarId,
      timeMin: startDate,
      timeMax: endDate
    });
    
    if (!eventsResponse.success || !eventsResponse.data) {
      throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, 'Failed to retrieve calendar events');
    }
    
    const events = eventsResponse.data;
    
    // 충돌 감지 수행
    const conflictDetection = await smartFeaturesService.detectConflicts(events);
    
    return {
      success: true,
      period: { startDate, endDate },
      totalEvents: events.length,
      conflictDetection
    };
  } catch (error) {
    log.error('MCP Error in detect_conflicts:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `충돌 감지 실패: ${error.message}`);
  }
}

/**
 * AI 기반 일정 최적화 추천
 */
export async function handleGenerateRecommendations(params: any): Promise<any> {
  const { startDate, endDate, calendarId = 'primary' } = params || {};
  
  if (!startDate || !endDate) {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'startDate and endDate are required');
  }

  try {
    // 지정된 기간의 모든 이벤트 조회
    const eventsResponse = await googleCalendarConnector.getEvents({
      calendarId,
      timeMin: startDate,
      timeMax: endDate
    });
    
    if (!eventsResponse.success || !eventsResponse.data) {
      throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, 'Failed to retrieve calendar events');
    }
    
    const events = eventsResponse.data;
    
    // AI 추천 생성
    const recommendations = await smartFeaturesService.generateRecommendations(events);
    
    return {
      success: true,
      period: { startDate, endDate },
      totalEvents: events.length,
      recommendations
    };
  } catch (error) {
    log.error('MCP Error in generate_recommendations:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `AI 추천 생성 실패: ${error.message}`);
  }
}

/**
 * 자동 알림 생성
 */
export async function handleGenerateAutomatedReminders(params: any): Promise<any> {
  const { eventId } = params || {};
  
  if (!eventId) {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'eventId is required');
  }

  try {
    // 캘린더 이벤트 조회
    const eventResponse = await googleCalendarConnector.getEvents({ eventId });
    if (!eventResponse.success || !eventResponse.data || eventResponse.data.length === 0) {
      throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, 'Failed to retrieve calendar event');
    }
    
    const event = eventResponse.data[0];
    
    // 자동 알림 생성
    const reminders = await smartFeaturesService.generateAutomatedReminders(event);
    
    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime
      },
      reminders
    };
  } catch (error) {
    log.error('MCP Error in generate_automated_reminders:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `자동 알림 생성 실패: ${error.message}`);
  }
}

/**
 * 생산성 인사이트 생성
 */
export async function handleGenerateProductivityInsights(params: any): Promise<any> {
  const { startDate, endDate, calendarId = 'primary' } = params || {};
  
  if (!startDate || !endDate) {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'startDate and endDate are required');
  }

  try {
    // 지정된 기간의 모든 이벤트 조회
    const eventsResponse = await googleCalendarConnector.getEvents({
      calendarId,
      timeMin: startDate,
      timeMax: endDate
    });
    
    if (!eventsResponse.success || !eventsResponse.data) {
      throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, 'Failed to retrieve calendar events');
    }
    
    const events = eventsResponse.data;
    
    // 생산성 인사이트 생성
    const insights = await smartFeaturesService.generateProductivityInsights(events);
    
    return {
      success: true,
      period: { startDate, endDate },
      insights
    };
  } catch (error) {
    log.error('MCP Error in generate_productivity_insights:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `생산성 인사이트 생성 실패: ${error.message}`);
  }
}

/**
 * 스마트 기능 설정 업데이트
 */
export async function handleUpdateSmartFeaturesConfig(params: any): Promise<any> {
  const { config } = params || {};
  
  if (!config || typeof config !== 'object') {
    throw createMCPError(MCPErrorCodes.INVALID_PARAMS, 'config object is required');
  }

  try {
    // 설정 업데이트
    smartFeaturesService.updateConfig(config);
    const updatedConfig = smartFeaturesService.getConfig();
    
    return {
      success: true,
      message: 'Smart features configuration updated successfully',
      config: updatedConfig
    };
  } catch (error) {
    log.error('MCP Error in update_smart_features_config:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `설정 업데이트 실패: ${error.message}`);
  }
}

/**
 * 스마트 기능 설정 조회
 */
export async function handleGetSmartFeaturesConfig(): Promise<any> {
  try {
    const config = smartFeaturesService.getConfig();
    
    return {
      success: true,
      config
    };
  } catch (error) {
    log.error('MCP Error in get_smart_features_config:', error);
    throw createMCPError(MCPErrorCodes.INTERNAL_ERROR, `설정 조회 실패: ${error.message}`);
  }
}

// 메서드 핸들러 등록
registerMethodHandler(MCPMethod.INITIALIZE, handleInitialize);
registerMethodHandler(MCPMethod.SHUTDOWN, handleShutdown);
registerMethodHandler(MCPMethod.EXIT, handleExit);
registerMethodHandler(MCPMethod.GET_RECENT_NOTES, handleGetRecentNotes);
registerMethodHandler(MCPMethod.GET_ALL_NOTES, handleGetAllNotes);
registerMethodHandler(MCPMethod.SEARCH_NOTES, handleSearchNotes);
registerMethodHandler(MCPMethod.GET_NOTE, handleGetNote);
registerMethodHandler(MCPMethod.CREATE_NOTE, handleCreateNote);
registerMethodHandler(MCPMethod.UPDATE_NOTE, handleUpdateNote);
registerMethodHandler(MCPMethod.DELETE_NOTE, handleDeleteNote);

// Phase 2: Obsidian ↔ Google Calendar 연동 메서드들
registerMethodHandler('calendar_to_note', handleCalendarToNote);
registerMethodHandler('note_to_calendar', handleNoteToCalendar);
registerMethodHandler('search_calendar_events', handleSearchCalendarEvents);
registerMethodHandler('sync_calendar_note', handleSyncCalendarNote);

// Phase 3: 스마트 기능 메서드들
registerMethodHandler('classify_event', handleClassifyEvent);
registerMethodHandler('detect_conflicts', handleDetectConflicts);
registerMethodHandler('generate_recommendations', handleGenerateRecommendations);
registerMethodHandler('generate_automated_reminders', handleGenerateAutomatedReminders);
registerMethodHandler('generate_productivity_insights', handleGenerateProductivityInsights);
registerMethodHandler('update_smart_features_config', handleUpdateSmartFeaturesConfig);
registerMethodHandler('get_smart_features_config', handleGetSmartFeaturesConfig);

// MCP 프로토콜 메인 핸들러
export async function handleProtocol(request: any): Promise<MCPResponse> {
  try {
    // 요청 검증
    if (!validateMCPRequest(request)) {
      const error = createMCPError(
        MCPErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC request'
      );
      return createMCPResponse(request.id, undefined, error);
    }

    const { method, params, id } = request as MCPRequest;

    // 메서드 핸들러 찾기
    const handler = methodHandlers.get(method);
    if (!handler) {
      const error = createMCPError(
        MCPErrorCodes.METHOD_NOT_FOUND,
        `Method '${method}' not found`
      );
      return createMCPResponse(id, undefined, error);
    }

    // 메서드 실행
    try {
      const result = await handler(params);
      return createMCPResponse(id, result);
    } catch (handlerError) {
      mcpLogger.error(method, handlerError);
      const error = createMCPError(
        MCPErrorCodes.INTERNAL_ERROR,
        'Internal server error',
        handlerError instanceof Error ? handlerError.message : 'Unknown error'
      );
      return createMCPResponse(id, undefined, error);
    }

  } catch (error) {
    mcpLogger.error('protocol_handler', error);
    const mcpError = createMCPError(
      MCPErrorCodes.INTERNAL_ERROR,
      'Internal server error'
    );
    return createMCPResponse(null, undefined, mcpError);
  }
} 