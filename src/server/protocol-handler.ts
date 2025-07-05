import { MCPRequest, MCPResponse, MCPError, MCPMethod } from '../types/mcp-types';
import { mcpLogger, log } from '../utils/logger';
import { ObsidianConnector, loadObsidianConfigFromFile } from '../connectors/obsidian-connector';
import { AIService } from '../services/ai-service';

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

// 전역 Connector 인스턴스들 (초기화)
const obsidianConnector = new ObsidianConnector(loadObsidianConfigFromFile());
const aiService = new AIService();

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
  const { id } = params;
  
  if (!id) {
    throw new Error('Note ID is required');
  }
  
  const success = await obsidianConnector.deleteNote(id);
  
  if (!success) {
    throw new Error('Note not found or could not be deleted');
  }
  
  return { success: true, message: 'Note deleted successfully' };
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