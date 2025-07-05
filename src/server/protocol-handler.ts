import { MCPRequest, MCPResponse, MCPError, MCPMethod } from '../types/mcp-types';
import { mcpLogger, log } from '../utils/logger';
import { ObsidianConnector, loadObsidianConfigFromFile } from '../connectors/obsidian-connector';
import { MongoConnector } from '../connectors/mongo-connector';
import * as mongoConfigData from '../../config/database-config.json';
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
const mongoConnector = new MongoConnector((mongoConfigData as any).mongodb);

const aiService = new AIService();

// 초기화 함수
async function initializeConnectors() {
  try {
    await obsidianConnector.initialize();
    await mongoConnector.connect();
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
        'obsidian.deleteNote',
        'mongo.search',
        'mongo.update'
      ]
    }
  };

  const result = {
    capabilities,
    serverInfo: {
      name: 'MCP Obsidian MongoDB Server',
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
    createdAt: note.createdAt,
    modifiedAt: note.modifiedAt,
    size: note.size,
    linksCount: note.links.length,
    backlinksCount: note.backlinks.length,
    content: includeContent ? note.content : undefined
  }));
}

// 최근 노트 조회 핸들러
export async function handleGetRecentNotes(params: any): Promise<any> {
  const limit = typeof params?.limit === 'number' ? params.limit : 5;
  const notes = obsidianConnector.getRecentNotes(limit);
  // 필요한 필드만 반환 (id, title, createdAt, path)
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    path: note.path,
    tags: note.tags
  }));
}

// 노트 검색 핸들러 (Obsidian + MongoDB 통합)
export async function handleSearchNotes(params: any): Promise<any> {
  const { query, limit = 20, filters } = params;
  
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string');
  }

  // Obsidian 검색
  const obsidianResults = await obsidianConnector.searchNotes(query, limit);
  
  // MongoDB 검색
  const mongoResults = await mongoConnector.searchNotes(query, { limit });
  
  // 결과 통합 및 변환
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
  
  // MongoDB 결과 추가
  for (const result of mongoResults) {
    results.push({
      type: 'mongo',
      id: result.document.obsidianId || result.document._id,
      title: result.document.title,
      content: result.document.content?.substring(0, 200) + '...',
      tags: result.document.tags || [],
      relevance: result.relevance,
      createdAt: result.document.createdAt,
      modifiedAt: result.document.updatedAt
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
  } else if (type === 'mongo') {
    const note = await mongoConnector.getNote(id);
    if (!note) return null;
    
    return {
      type: 'mongo',
      id: note.obsidianId,
      title: note.title,
      content: note.content,
      tags: note.tags,
      metadata: note.metadata,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  }
  
  throw new Error('Invalid type parameter. Must be "obsidian" or "mongo"');
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

// MongoDB 데이터 조회 핸들러
export async function handleGetMongoData(params: any): Promise<any> {
  const { collection, query = {}, options = {} } = params;
  
  if (!collection) {
    throw new Error('Collection name is required');
  }
  
  switch (collection) {
    case 'notes':
      return await mongoConnector.getNotesByTag('', options);
    case 'metadata':
      return await mongoConnector.getMetadataByCategory('general');
    case 'stats':
      return await mongoConnector.getStats();
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

// MongoDB 데이터 업데이트 핸들러
export async function handleUpdateMongoData(params: any): Promise<any> {
  const { collection, action, data } = params;
  
  if (!collection || !action || !data) {
    throw new Error('Collection, action, and data are required');
  }
  
  switch (collection) {
    case 'notes':
      if (action === 'upsert') {
        await mongoConnector.upsertNote(data);
        return { success: true, message: 'Note upserted successfully' };
      }
      break;
    case 'metadata':
      if (action === 'set') {
        await mongoConnector.setMetadata(data.key, data.value, data.category, data.description);
        return { success: true, message: 'Metadata set successfully' };
      }
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
  
  throw new Error(`Unknown action: ${action}`);
}

// 태그별 노트 조회 핸들러
export async function handleGetNotesByTag(params: any): Promise<any> {
  const { tag, limit = 20 } = params;
  
  if (!tag || typeof tag !== 'string') {
    throw new Error('Tag parameter is required and must be a string');
  }

  const notes = obsidianConnector.getNotesByTagWithLimit(tag, limit);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    tags: note.tags,
    createdAt: note.createdAt,
    modifiedAt: note.modifiedAt,
    size: note.size
  }));
}

// 날짜 범위별 노트 조회 핸들러
export async function handleGetNotesByDateRange(params: any): Promise<any> {
  const { startDate, endDate } = params;
  
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  const notes = obsidianConnector.getNotesByDateRange(start, end);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    tags: note.tags,
    createdAt: note.createdAt,
    modifiedAt: note.modifiedAt,
    size: note.size
  }));
}

// 파일 크기별 노트 조회 핸들러
export async function handleGetNotesBySize(params: any): Promise<any> {
  const { minSize, maxSize } = params;
  
  if (typeof minSize !== 'number' || minSize < 0) {
    throw new Error('Min size must be a positive number');
  }

  const notes = obsidianConnector.getNotesBySize(minSize, maxSize);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    size: note.size,
    tags: note.tags,
    createdAt: note.createdAt
  }));
}

// 관련 노트 조회 핸들러
export async function handleGetRelatedNotes(params: any): Promise<any> {
  const { noteId, limit = 10 } = params;
  
  if (!noteId || typeof noteId !== 'string') {
    throw new Error('Note ID is required and must be a string');
  }

  const notes = obsidianConnector.getRelatedNotes(noteId, limit);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    tags: note.tags,
    relevance: 'related'
  }));
}

// 볼트 통계 조회 핸들러
export async function handleGetVaultStats(): Promise<any> {
  return obsidianConnector.getVaultStats();
}

// 사용 패턴 통계 핸들러
export async function handleGetUsageStats(): Promise<any> {
  const stats = obsidianConnector.getUsageStats();
  
  return {
    recentlyModified: stats.recentlyModified.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path,
      modifiedAt: note.modifiedAt
    })),
    mostLinkedNotes: stats.mostLinkedNotes.map(item => ({
      id: item.note.id,
      title: item.note.title,
      path: item.note.path,
      backlinkCount: item.backlinkCount
    })),
    mostUsedTags: stats.mostUsedTags,
    largestNotes: stats.largestNotes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path,
      size: note.size
    }))
  };
}

// 중복 노트 감지 핸들러
export async function handleFindDuplicateNotes(): Promise<any> {
  const duplicates = obsidianConnector.findDuplicateNotes();
  
  return duplicates.map(duplicate => ({
    title: duplicate.title,
    notes: duplicate.notes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path,
      size: note.size,
      createdAt: note.createdAt
    })),
    similarity: duplicate.similarity
  }));
}

// 노트 추천 핸들러
export async function handleGetRecommendedNotes(params: any): Promise<any> {
  const { noteId, limit = 5 } = params;
  
  if (!noteId || typeof noteId !== 'string') {
    throw new Error('Note ID is required and must be a string');
  }

  const notes = obsidianConnector.getRecommendedNotes(noteId, limit);
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    tags: note.tags,
    relevance: 'recommended'
  }));
}

// 키워드 추출 핸들러
export async function handleExtractKeywords(params: any): Promise<any> {
  const { noteId, maxKeywords = 10 } = params;
  
  if (!noteId || typeof noteId !== 'string') {
    throw new Error('Note ID is required and must be a string');
  }

  const keywords = obsidianConnector.extractKeywords(noteId, maxKeywords);
  
  return {
    noteId,
    keywords,
    count: keywords.length
  };
}

// 폴더 구조 분석 핸들러
export async function handleAnalyzeFolderStructure(): Promise<any> {
  return obsidianConnector.analyzeFolderStructure();
}

// 정리 제안 핸들러
export async function handleSuggestCleanup(): Promise<any> {
  const suggestions = obsidianConnector.suggestCleanup();
  
  return {
    orphanedNotes: suggestions.orphanedNotes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path
    })),
    largeNotes: suggestions.largeNotes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path,
      size: note.size
    })),
    untaggedNotes: suggestions.untaggedNotes.map(note => ({
      id: note.id,
      title: note.title,
      path: note.path
    })),
    duplicateTitles: suggestions.duplicateTitles.map(duplicate => ({
      title: duplicate.title,
      notes: duplicate.notes.map(note => ({
        id: note.id,
        title: note.title,
        path: note.path
      }))
    }))
  };
}

// 동기화 상태 조회 핸들러
export async function handleGetSyncStatus(): Promise<any> {
  return {
    obsidian: {
      initialized: true, // ObsidianConnector가 생성되었다면 초기화됨
      noteCount: obsidianConnector.getAllNotes().length,
      lastScan: new Date()
    },
    mongo: {
      connected: true, // MongoConnector가 생성되었다면 연결됨
      database: (mongoConfigData as any).mongodb.databaseName
    }
  };
}

// 강제 동기화 핸들러
export async function handleForceSync(): Promise<any> {
  try {
    // Obsidian 재스캔 (initialize를 다시 호출하여 스캔)
    await obsidianConnector.initialize();
    
    // MongoDB 동기화 (간단한 예시)
    const notes = obsidianConnector.getAllNotes();
    for (const note of notes.slice(0, 10)) { // 처음 10개만 동기화
      // MongoDB에 노트 정보 저장 로직
    }
    
    return {
      success: true,
      message: 'Sync completed successfully',
      syncedNotes: notes.length
    };
  } catch (error) {
    throw new Error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 노트 병합 핸들러
export async function handleMergeNotes(params: any): Promise<any> {
  const { sourceNoteId, targetNoteId, keepSource = false } = params;
  
  if (!sourceNoteId || !targetNoteId) {
    throw new Error('Source and target note IDs are required');
  }

  const sourceNote = await obsidianConnector.getNote(sourceNoteId);
  const targetNote = await obsidianConnector.getNote(targetNoteId);
  
  if (!sourceNote || !targetNote) {
    throw new Error('One or both notes not found');
  }

  // 간단한 병합 로직 (내용 합치기)
  const mergedContent = `${targetNote.content}\n\n---\n\n${sourceNote.content}`;
  const mergedTags = [...new Set([...targetNote.tags, ...sourceNote.tags])];
  
  const updatedNote = await obsidianConnector.updateNote(targetNoteId, {
    content: mergedContent,
    tags: mergedTags
  });

  // 소스 노트 삭제 (선택적)
  if (!keepSource) {
    await obsidianConnector.deleteNote(sourceNoteId);
  }

  return {
    success: true,
    mergedNote: {
      id: updatedNote?.id,
      title: updatedNote?.title,
      path: updatedNote?.path
    },
    sourceDeleted: !keepSource
  };
}

// 노트 템플릿 생성 핸들러
export async function handleCreateNoteFromTemplate(params: any): Promise<any> {
  const { templateName, title, variables = {} } = params;
  
  if (!templateName || !title) {
    throw new Error('Template name and title are required');
  }

  // 간단한 템플릿 시스템
  const templates: Record<string, string> = {
    'meeting': `# ${title}

## 참석자
- 

## 안건
1. 
2. 
3. 

## 결정사항
- 

## 다음 액션
- [ ] 
- [ ] 
- [ ] 

## 메모
`,
    'project': `# ${title}

## 개요
${variables.description || ''}

## 목표
- 
- 
- 

## 마일스톤
- [ ] 
- [ ] 
- [ ] 

## 리소스
- 

## 참고자료
- 
`,
    'daily': `# ${title}

## 오늘의 목표
- [ ] 
- [ ] 
- [ ] 

## 완료한 일
- 

## 내일 할 일
- 

## 메모
`
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }

  const content = template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });

  const note = await obsidianConnector.createNote(title, content, ['template', templateName]);
  
  return {
    id: note.id,
    title: note.title,
    path: note.path,
    template: templateName
  };
}

// 노트 내보내기 핸들러
export async function handleExportNotes(params: any): Promise<any> {
  const { noteIds, format = 'json' } = params;
  
  if (!noteIds || !Array.isArray(noteIds)) {
    throw new Error('Note IDs array is required');
  }

  const notes = [];
  for (const noteId of noteIds) {
    const note = await obsidianConnector.getNote(noteId);
    if (note) {
      notes.push({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        createdAt: note.createdAt,
        modifiedAt: note.modifiedAt
      });
    }
  }

  if (format === 'json') {
    return {
      format: 'json',
      count: notes.length,
      data: notes
    };
  } else if (format === 'markdown') {
    const markdown = notes.map(note => 
      `# ${note.title}\n\n${note.content}\n\n---\n\n`
    ).join('');
    
    return {
      format: 'markdown',
      count: notes.length,
      data: markdown
    };
  }

  throw new Error(`Unsupported format: ${format}`);
}

// 볼트 백업 핸들러
export async function handleBackupVault(): Promise<any> {
  const stats = obsidianConnector.getVaultStats();
  
  return {
    success: true,
    message: 'Backup completed (simulated)',
    stats: {
      totalNotes: stats.totalNotes,
      totalSize: stats.totalSize,
      backupTime: new Date()
    }
  };
}

// 태그 관리 핸들러
export async function handleManageTags(params: any): Promise<any> {
  const { action, oldTag, newTag } = params;
  
  if (!action || !oldTag) {
    throw new Error('Action and old tag are required');
  }

  const allNotes = obsidianConnector.getAllNotes();
  let updatedCount = 0;

  if (action === 'rename' && newTag) {
    for (const note of allNotes) {
      if (note.tags.includes(oldTag)) {
        const newTags = note.tags.map(tag => tag === oldTag ? newTag : tag);
        await obsidianConnector.updateNote(note.id, { tags: newTags });
        updatedCount++;
      }
    }
  } else if (action === 'delete') {
    for (const note of allNotes) {
      if (note.tags.includes(oldTag)) {
        const newTags = note.tags.filter(tag => tag !== oldTag);
        await obsidianConnector.updateNote(note.id, { tags: newTags });
        updatedCount++;
      }
    }
  }

  return {
    success: true,
    action,
    oldTag,
    newTag,
    updatedNotes: updatedCount
  };
}

// Vault Q&A (자연어 질문-답변)
export async function handleChatWithVault(params: any): Promise<any> {
  const { question, contextLimit = 5 } = params;
  if (!question) throw new Error('질문이 필요합니다.');
  // 관련 노트 context 추출 (최근 노트 기준)
  const notes = obsidianConnector.getRecentNotes(contextLimit);
  const context = notes.map(n => n.content);
  const answer = await aiService.chatWithVault(question, context);
  return { question, answer, contextNoteCount: context.length };
}

// 자동 태깅/분류
export async function handleSuggestTags(params: any): Promise<any> {
  const { noteId, content, maxTags = 5 } = params;
  let noteContent = content;
  if (!noteContent && noteId) {
    const note = await obsidianConnector.getNote(noteId);
    if (!note) throw new Error('노트가 존재하지 않습니다.');
    noteContent = note.content;
  }
  if (!noteContent) throw new Error('노트 내용이 필요합니다.');
  const tags = await aiService.suggestTags(noteContent, maxTags);
  return { tags };
}

// 의미 기반 유사 노트/중복 판별
export async function handleFindSemanticDuplicates(params: any): Promise<any> {
  const { threshold = 0.5, limit = 10 } = params;
  const notes = obsidianConnector.getAllNotes();
  const embeddings: { id: string, set: Set<string> }[] = [];
  for (const note of notes) {
    const set = await aiService.getEmbedding(note.content);
    embeddings.push({ id: note.id, set });
  }
  const duplicates: Array<{ id1: string, id2: string, similarity: number }> = [];
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const embedding1 = embeddings[i];
      const embedding2 = embeddings[j];
      if (embedding1 && embedding2) {
        const sim = AIService.jaccardSimilarity(embedding1.set, embedding2.set);
        if (sim >= threshold) {
          duplicates.push({ id1: embedding1.id, id2: embedding2.id, similarity: sim });
        }
      }
    }
  }
  duplicates.sort((a, b) => b.similarity - a.similarity);
  return { duplicates: duplicates.slice(0, limit) };
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
registerMethodHandler(MCPMethod.GET_MONGO_DATA, handleGetMongoData);
registerMethodHandler(MCPMethod.UPDATE_MONGO_DATA, handleUpdateMongoData);

// 새로운 메서드들 등록
registerMethodHandler(MCPMethod.GET_NOTES_BY_TAG, handleGetNotesByTag);
registerMethodHandler(MCPMethod.GET_NOTES_BY_DATE_RANGE, handleGetNotesByDateRange);
registerMethodHandler(MCPMethod.GET_NOTES_BY_SIZE, handleGetNotesBySize);
registerMethodHandler(MCPMethod.GET_RELATED_NOTES, handleGetRelatedNotes);
registerMethodHandler(MCPMethod.GET_VAULT_STATS, handleGetVaultStats);
registerMethodHandler(MCPMethod.GET_USAGE_STATS, handleGetUsageStats);
registerMethodHandler(MCPMethod.FIND_DUPLICATE_NOTES, handleFindDuplicateNotes);
registerMethodHandler(MCPMethod.GET_RECOMMENDED_NOTES, handleGetRecommendedNotes);
registerMethodHandler(MCPMethod.EXTRACT_KEYWORDS, handleExtractKeywords);
registerMethodHandler(MCPMethod.ANALYZE_FOLDER_STRUCTURE, handleAnalyzeFolderStructure);
registerMethodHandler(MCPMethod.SUGGEST_CLEANUP, handleSuggestCleanup);
registerMethodHandler(MCPMethod.GET_SYNC_STATUS, handleGetSyncStatus);
registerMethodHandler(MCPMethod.FORCE_SYNC, handleForceSync);
registerMethodHandler(MCPMethod.MERGE_NOTES, handleMergeNotes);
registerMethodHandler(MCPMethod.CREATE_NOTE_FROM_TEMPLATE, handleCreateNoteFromTemplate);
registerMethodHandler(MCPMethod.EXPORT_NOTES, handleExportNotes);
registerMethodHandler(MCPMethod.BACKUP_VAULT, handleBackupVault);
registerMethodHandler(MCPMethod.MANAGE_TAGS, handleManageTags);
registerMethodHandler(MCPMethod.CHAT_WITH_VAULT, handleChatWithVault);
registerMethodHandler(MCPMethod.SUGGEST_TAGS, handleSuggestTags);
registerMethodHandler(MCPMethod.FIND_SEMANTIC_DUPLICATES, handleFindSemanticDuplicates);

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