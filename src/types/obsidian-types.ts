// Obsidian 관련 타입 정의

export interface ObsidianVault {
  path: string;
  name: string;
  notes: ObsidianNote[];
  attachments: string[];
  templates: string[];
}

export interface ObsidianNote {
  id: string;
  title: string;
  content: string;
  path: string;
  fileName: string;
  frontmatter: ObsidianFrontmatter;
  tags: string[];
  links: ObsidianLink[];
  backlinks: ObsidianLink[];
  createdAt: Date;
  modifiedAt: Date;
  size: number;
}

export interface ObsidianFrontmatter {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  modified?: string;
  [key: string]: any;
}

export interface ObsidianLink {
  type: 'internal' | 'external' | 'attachment';
  target: string;
  displayText?: string;
  path?: string | undefined;
}

export interface ObsidianFileWatcher {
  path: string;
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  stats?: any;
}

export interface ObsidianSearchResult {
  note: ObsidianNote;
  relevance: number;
  matchedTerms: string[];
  context: string;
}

export interface ObsidianConfig {
  vaultPath: string;
  ignorePatterns: string[];
  includeAttachments: boolean;
  watchForChanges: boolean;
  maxFileSize: number; // bytes
} 