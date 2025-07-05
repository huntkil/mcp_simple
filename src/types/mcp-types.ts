// MCP (Model Context Protocol) 기본 타입 정의

export interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number | null;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  result?: any;
  error?: MCPError;
}

export interface MCPNotification extends MCPMessage {
  method: string;
  params?: any;
}

// MCP 서버 설정 타입
export interface MCPServerConfig {
  port: number;
  host: string;
  logLevel: string;
  obsidianVaultPath?: string;
}

// MCP 메서드 타입
export enum MCPMethod {
  // 기본 MCP 메서드
  INITIALIZE = 'initialize',
  SHUTDOWN = 'shutdown',
  EXIT = 'exit',
  
  // 커스텀 메서드
  SEARCH_NOTES = 'search_notes',
  GET_NOTE = 'get_note',
  UPDATE_NOTE = 'update_note',
  CREATE_NOTE = 'create_note',
  DELETE_NOTE = 'delete_note',
  GET_RECENT_NOTES = 'get_recent_notes',
  GET_ALL_NOTES = 'get_all_notes',
  
  // 검색 및 필터링 강화
  GET_NOTES_BY_TAG = 'get_notes_by_tag',
  GET_NOTES_BY_DATE_RANGE = 'get_notes_by_date_range',
  GET_NOTES_BY_SIZE = 'get_notes_by_size',
  GET_RELATED_NOTES = 'get_related_notes',
  
  // 통계 및 분석
  GET_VAULT_STATS = 'get_vault_stats',
  GET_USAGE_STATS = 'get_usage_stats',
  FIND_DUPLICATE_NOTES = 'find_duplicate_notes',
  
  // 고급 기능
  MERGE_NOTES = 'merge_notes',
  CREATE_NOTE_FROM_TEMPLATE = 'create_note_from_template',
  EXPORT_NOTES = 'export_notes',
  BACKUP_VAULT = 'backup_vault',
  
  // 동기화 및 통합
  GET_SYNC_STATUS = 'get_sync_status',
  FORCE_SYNC = 'force_sync',
  RESOLVE_CONFLICTS = 'resolve_conflicts',
  
  // 실용적 기능
  GET_RECOMMENDED_NOTES = 'get_recommended_notes',
  SUMMARIZE_NOTE = 'summarize_note',
  EXTRACT_KEYWORDS = 'extract_keywords',
  CLASSIFY_NOTES = 'classify_notes',
  
  // 관리 기능
  MANAGE_TAGS = 'manage_tags',
  ANALYZE_FOLDER_STRUCTURE = 'analyze_folder_structure',
  SUGGEST_CLEANUP = 'suggest_cleanup',

  // AI/LLM 기능
  CHAT_WITH_VAULT = 'chat_with_vault',
  SUGGEST_TAGS = 'suggest_tags',
  FIND_SEMANTIC_DUPLICATES = 'find_semantic_duplicates'
}

// 검색 파라미터 타입
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    type?: 'note' | 'both';
  };
}

// 노트 타입
export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  tags: string[];
  frontmatter: Record<string, any>;
  links: string[];
  createdAt: Date;
  updatedAt: Date;
} 