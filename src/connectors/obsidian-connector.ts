import * as fs from 'fs';
import * as path from 'path';
import { 
  ObsidianVault, 
  ObsidianNote, 
  ObsidianConfig,
  ObsidianSearchResult 
} from '../types/obsidian-types';
import { 
  parseMarkdownFile, 
  extractLinks, 
  extractTags, 
  extractTitle, 
  generateNoteId,
  isValidMarkdownFile,
  checkFileSize,
  normalizeKoreanFileName,
  createSafeFileName
} from '../utils/markdown-parser';
import { FileWatcher, FileWatcherOptions } from '../utils/file-watcher';
import { log } from '../utils/logger';

export class ObsidianConnector {
  private config: ObsidianConfig;
  private vault: ObsidianVault | null = null;
  private fileWatcher: FileWatcher | null = null;
  private notesCache: Map<string, ObsidianNote> = new Map();
  private isInitialized = false;

  constructor(config: ObsidianConfig) {
    this.config = config;
  }

  // 초기화
  async initialize(): Promise<void> {
    try {
      log.info(`Initializing Obsidian connector for vault: ${this.config.vaultPath}`);
      
      // vault 경로 확인
      if (!fs.existsSync(this.config.vaultPath)) {
        throw new Error(`Vault path does not exist: ${this.config.vaultPath}`);
      }

      // vault 정보 생성
      this.vault = {
        path: this.config.vaultPath,
        name: path.basename(this.config.vaultPath),
        notes: [],
        attachments: [],
        templates: []
      };

      // 초기 노트 스캔
      await this.scanVault();

      // 파일 감시 시작
      if (this.config.watchForChanges) {
        await this.startFileWatcher();
      }

      this.isInitialized = true;
      log.info(`Obsidian connector initialized successfully. Found ${this.vault.notes.length} notes.`);

    } catch (error) {
      log.error('Failed to initialize Obsidian connector:', error);
      throw error;
    }
  }

  // vault 스캔
  private async scanVault(): Promise<void> {
    if (!this.vault) return;

    log.info('Scanning Obsidian vault...');
    const notes: ObsidianNote[] = [];
    const attachments: string[] = [];
    const templates: string[] = [];

    // 재귀적으로 파일 스캔
    await this.scanDirectory(this.vault.path, notes, attachments, templates);

    this.vault.notes = notes;
    this.vault.attachments = attachments;
    this.vault.templates = templates;

    // 캐시 업데이트
    this.notesCache.clear();
    notes.forEach(note => {
      this.notesCache.set(note.id, note);
    });

    log.info(`Vault scan completed. Notes: ${notes.length}, Attachments: ${attachments.length}, Templates: ${templates.length}`);
  }

  // 디렉토리 재귀 스캔
  private async scanDirectory(
    dirPath: string, 
    notes: ObsidianNote[], 
    attachments: string[], 
    templates: string[]
  ): Promise<void> {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        // .obsidian 폴더 무시
        if (item === '.obsidian') continue;

        if (stat.isDirectory()) {
          await this.scanDirectory(fullPath, notes, attachments, templates);
        } else if (stat.isFile()) {
          // 마크다운 파일 처리
          if (isValidMarkdownFile(fullPath)) {
            if (checkFileSize(fullPath, this.config.maxFileSize)) {
              try {
                const note = await this.parseNote(fullPath);
                notes.push(note);
              } catch (error) {
                log.warn(`Failed to parse note: ${fullPath}`, error);
              }
            } else {
              log.warn(`File too large, skipping: ${fullPath}`);
            }
          }
          // 첨부파일 처리
          else if (this.config.includeAttachments) {
            attachments.push(fullPath);
          }
        }
      }
    } catch (error) {
      log.error(`Error scanning directory: ${dirPath}`, error);
    }
  }

  // 노트 파싱 (한글 파일명 지원 개선)
  private async parseNote(filePath: string): Promise<ObsidianNote> {
    const { frontmatter, content } = parseMarkdownFile(filePath);
    const fileName = path.basename(filePath);
    
    // 한글 파일명 정규화
    const normalizedFileName = normalizeKoreanFileName(fileName);
    const title = extractTitle(content, frontmatter, normalizedFileName);
    const tags = extractTags(content, frontmatter);
    const links = extractLinks(content);
    const id = generateNoteId(filePath);
    const stats = fs.statSync(filePath);

    const note: ObsidianNote = {
      id,
      title,
      content,
      path: filePath,
      fileName: normalizedFileName, // 정규화된 파일명 사용
      frontmatter,
      tags,
      links,
      backlinks: [], // 나중에 계산
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      size: stats.size
    };

    return note;
  }

  // 파일 감시 시작
  private async startFileWatcher(): Promise<void> {
    if (!this.vault) return;

    const options: FileWatcherOptions = {
      path: this.vault.path,
      ignorePatterns: this.config.ignorePatterns,
      onFileAdd: this.handleFileAdd.bind(this),
      onFileChange: this.handleFileChange.bind(this),
      onFileDelete: this.handleFileDelete.bind(this)
    };

    this.fileWatcher = new FileWatcher(options);
    this.fileWatcher.start();
  }

  // 파일 추가 처리 (MCP API 호출 분리)
  private async handleFileAdd(event: any): Promise<void> {
    if (!isValidMarkdownFile(event.path)) return;

    try {
      // 한글 파일명 정규화
      const normalizedPath = normalizeKoreanFileName(event.path);
      log.info(`New note detected: ${normalizedPath}`);
      
      // 파일이 실제로 존재하는지 확인
      if (!fs.existsSync(event.path)) {
        log.warn(`File does not exist, skipping: ${normalizedPath}`);
        return;
      }

      // 파일 크기 확인
      const stats = fs.statSync(event.path);
      if (!checkFileSize(event.path, this.config.maxFileSize)) {
        log.warn(`File too large, skipping: ${normalizedPath}`);
        return;
      }

      // 이미 존재하는 노트인지 확인 (더 정확한 검사)
      const existingNote = this.vault?.notes.find(note => {
        return note.path === event.path || 
               note.fileName === path.basename(event.path) ||
               note.title === path.basename(event.path, '.md');
      });
      
      if (existingNote) {
        log.debug(`Note already exists, skipping: ${normalizedPath}`);
        return;
      }

      // 노트 파싱 및 추가 (MCP API 호출 없이 직접 처리)
      const note = await this.parseNote(event.path);
      
      if (this.vault) {
        this.vault.notes.push(note);
      }
      this.notesCache.set(note.id, note);

      log.info(`Successfully added new note: ${note.title} (${normalizedPath})`);

      // 백링크 업데이트 (비동기로 처리)
      this.updateBacklinks().catch(error => {
        log.error(`Failed to update backlinks for new note: ${normalizedPath}`, error);
      });

    } catch (error) {
      log.error(`Failed to handle new file: ${normalizeKoreanFileName(event.path)}`, error);
      
      // 에러 발생 시 파일 재시도 로직 (지연 시간 증가)
      setTimeout(() => {
        this.retryFileProcessing(event.path, 'add').catch(retryError => {
          log.error(`Retry failed for file: ${normalizeKoreanFileName(event.path)}`, retryError);
        });
      }, 10000); // 10초 후 재시도 (시간 증가)
    }
  }

  // 파일 변경 처리 (MCP API 호출 분리)
  private async handleFileChange(event: any): Promise<void> {
    if (!isValidMarkdownFile(event.path)) return;

    try {
      const normalizedPath = normalizeKoreanFileName(event.path);
      log.debug(`File changed: ${normalizedPath}`);
      
      // 파일이 실제로 존재하는지 확인
      if (!fs.existsSync(event.path)) {
        log.warn(`Changed file does not exist, skipping: ${normalizedPath}`);
        return;
      }

      // 기존 노트 찾기 (더 정확한 검사)
      const existingNoteIndex = this.vault?.notes.findIndex(note => {
        return note.path === event.path || 
               note.fileName === path.basename(event.path) ||
               note.title === path.basename(event.path, '.md');
      });
      
      if (existingNoteIndex === undefined || existingNoteIndex === -1) {
        log.debug(`Note not found in vault, treating as new file: ${normalizedPath}`);
        await this.handleFileAdd(event);
        return;
      }

      // 노트 업데이트 (MCP API 호출 없이 직접 처리)
      const updatedNote = await this.parseNote(event.path);
      
      if (this.vault) {
        this.vault.notes[existingNoteIndex] = updatedNote;
      }
      this.notesCache.set(updatedNote.id, updatedNote);

      log.debug(`Successfully updated note: ${updatedNote.title} (${normalizedPath})`);

      // 백링크 업데이트 (비동기로 처리)
      this.updateBacklinks().catch(error => {
        log.error(`Failed to update backlinks for changed note: ${normalizedPath}`, error);
      });

    } catch (error) {
      log.error(`Failed to handle file change: ${normalizeKoreanFileName(event.path)}`, error);
      
      // 에러 발생 시 파일 재시도 로직 (지연 시간 증가)
      setTimeout(() => {
        this.retryFileProcessing(event.path, 'change').catch(retryError => {
          log.error(`Retry failed for changed file: ${normalizeKoreanFileName(event.path)}`, retryError);
        });
      }, 10000); // 10초 후 재시도 (시간 증가)
    }
  }

  // 파일 삭제 처리 (한글 파일명 지원 개선)
  private async handleFileDelete(event: any): Promise<void> {
    if (!isValidMarkdownFile(event.path)) return;

    try {
      const normalizedPath = normalizeKoreanFileName(event.path);
      log.debug(`File deleted: ${normalizedPath}`);
      
      // 기존 노트 찾기
      const existingNoteIndex = this.vault?.notes.findIndex(note => note.path === event.path);
      if (existingNoteIndex === undefined || existingNoteIndex === -1) {
        log.debug(`Note not found in vault, skipping deletion: ${normalizedPath}`);
        return;
      }

      // 노트 제거
      if (this.vault) {
        const removedNote = this.vault.notes.splice(existingNoteIndex, 1)[0];
        this.notesCache.delete(removedNote.id);
        log.debug(`Successfully removed note: ${removedNote.title}`);
      }

      // 백링크 업데이트 (비동기로 처리)
      this.updateBacklinks().catch(error => {
        log.error(`Failed to update backlinks after note deletion: ${normalizedPath}`, error);
      });

    } catch (error) {
      log.error(`Failed to handle file deletion: ${normalizeKoreanFileName(event.path)}`, error);
    }
  }

  // 파일 처리 재시도 로직 (한글 파일명 지원 개선)
  private async retryFileProcessing(filePath: string, eventType: 'add' | 'change'): Promise<void> {
    try {
      const normalizedPath = normalizeKoreanFileName(filePath);
      log.info(`Retrying file processing: ${normalizedPath} (${eventType})`);
      
      if (!fs.existsSync(filePath)) {
        log.warn(`File still does not exist during retry: ${normalizedPath}`);
        return;
      }

      if (eventType === 'add') {
        await this.handleFileAdd({ path: filePath });
      } else if (eventType === 'change') {
        await this.handleFileChange({ path: filePath });
      }
      
      log.info(`Retry successful for file: ${normalizedPath}`);
    } catch (error) {
      log.error(`Retry failed for file: ${normalizeKoreanFileName(filePath)}`, error);
      throw error;
    }
  }

  // 백링크 업데이트
  private async updateBacklinks(): Promise<void> {
    if (!this.vault) return;

    // 모든 노트의 백링크 초기화
    this.vault.notes.forEach(note => {
      note.backlinks = [];
    });

    // 각 노트의 링크를 확인하여 백링크 생성
    this.vault.notes.forEach(note => {
      note.links.forEach(link => {
        if (link.type === 'internal' && link.path) {
          // 링크된 노트 찾기
          const linkedNote = this.vault!.notes.find(n => 
            n.title === link.target || 
            n.fileName.replace(/\.md$/, '') === link.target ||
            n.id === link.target
          );

          if (linkedNote) {
            linkedNote.backlinks.push({
              type: 'internal',
              target: note.title,
              displayText: note.title,
              path: note.path
            });
          }
        }
      });
    });
  }

  // 노트 검색
  async searchNotes(query: string, limit: number = 20): Promise<ObsidianSearchResult[]> {
    if (!this.vault) return [];

    const results: ObsidianSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const note of this.vault.notes) {
      let relevance = 0;
      const matchedTerms: string[] = [];

      // 제목 검색 (방어 로직 추가)
      if (note.title && String(note.title).toLowerCase().includes(queryLower)) {
        relevance += 10;
        matchedTerms.push('title');
      }

      // 태그 검색 (방어 로직 추가)
      if (note.tags && Array.isArray(note.tags) && note.tags.some(tag => tag && tag.toLowerCase().includes(queryLower))) {
        relevance += 8;
        matchedTerms.push('tags');
      }

      // 콘텐츠 검색 (방어 로직 추가)
      if (note.content && note.content.toLowerCase().includes(queryLower)) {
        relevance += 5;
        matchedTerms.push('content');
      }

      // 프론트매터 검색 (방어 로직 추가)
      if (note.frontmatter) {
        try {
          const frontmatterStr = JSON.stringify(note.frontmatter).toLowerCase();
          if (frontmatterStr.includes(queryLower)) {
            relevance += 3;
            matchedTerms.push('frontmatter');
          }
        } catch (error) {
          log.warn(`Failed to stringify frontmatter for note: ${note.path}`, error);
        }
      }

      if (relevance > 0) {
        // 컨텍스트 추출 (방어 로직 추가)
        const context = note.content ? this.extractContext(note.content, queryLower) : '';
        
        results.push({
          note,
          relevance,
          matchedTerms,
          context
        });
      }
    }

    // 관련성 순으로 정렬
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, limit);
  }

  // 컨텍스트 추출
  private extractContext(content: string, query: string, contextLength: number = 100): string {
    // 방어 로직 추가
    if (!content || !query) return '';
    
    try {
      const index = content.toLowerCase().indexOf(query);
      if (index === -1) return '';

      const start = Math.max(0, index - contextLength / 2);
      const end = Math.min(content.length, index + query.length + contextLength / 2);
      
      let context = content.substring(start, end);
      
      // 문장 경계 조정
      if (start > 0) {
        const sentenceStart = context.indexOf('.') + 1;
        if (sentenceStart > 0 && sentenceStart < context.length / 2) {
          context = context.substring(sentenceStart);
        }
      }
      
      if (end < content.length) {
        const sentenceEnd = context.lastIndexOf('.');
        if (sentenceEnd > context.length / 2) {
          context = context.substring(0, sentenceEnd + 1);
        }
      }

      return context.trim();
    } catch (error) {
      log.warn(`Failed to extract context for query: ${query}`, error);
      return '';
    }
  }

  // 노트 가져오기
  async getNote(id: string): Promise<ObsidianNote | null> {
    return this.notesCache.get(id) || null;
  }

  // 노트 생성 (한글 파일명 지원 개선)
  async createNote(title: string, content: string, tags: string[] = []): Promise<ObsidianNote> {
    if (!this.vault) {
      throw new Error('Vault not initialized');
    }

    // 제목 검증 및 정리
    if (!title || typeof title !== 'string') {
      throw new Error('Title is required and must be a string');
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      throw new Error('Title cannot be empty or contain only whitespace');
    }

    // 안전한 파일명 생성 (한글 지원)
    const fileName = createSafeFileName(cleanTitle);
    
    // 중복 파일명 처리
    let finalFileName = `${fileName}.md`;
    let counter = 1;
    const maxAttempts = 100;
    
    while (counter <= maxAttempts) {
      const filePath = path.join(this.vault.path, finalFileName);
      
      if (!fs.existsSync(filePath)) {
        // 파일이 존재하지 않으면 생성 진행
        try {
          // 마크다운 콘텐츠 생성
          const frontmatter = {
            title: cleanTitle,
            tags: Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };

          const markdownContent = `---
title: ${cleanTitle}
tags: ${frontmatter.tags.join(', ')}
created: ${frontmatter.created}
modified: ${frontmatter.modified}
---

${content}`;

          // 파일 작성 (UTF-8 인코딩 명시)
          fs.writeFileSync(filePath, markdownContent, { encoding: 'utf8', flag: 'w' });

          // 노트 파싱 및 캐시에 추가
          const note = await this.parseNote(filePath);
          
          if (this.vault) {
            this.vault.notes.push(note);
          }
          this.notesCache.set(note.id, note);

          log.info(`Created new note: ${filePath}`);
          return note;
          
        } catch (error) {
          log.error(`Failed to create note file: ${filePath}`, error);
          throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 파일이 존재하면 다른 이름 시도
      finalFileName = `${fileName} (${counter}).md`;
      counter++;
    }
    
    throw new Error(`Could not create note with title "${cleanTitle}" - too many duplicate files exist`);
  }

  // 노트 업데이트
  async updateNote(id: string, updates: Partial<ObsidianNote>): Promise<ObsidianNote | null> {
    const note = await this.getNote(id);
    if (!note) return null;

    const updatedNote = { ...note, ...updates };
    
    // 파일 업데이트
    const frontmatter = {
      ...note.frontmatter,
      ...updates.frontmatter,
      modified: new Date().toISOString()
    };

    const markdownContent = `---
${Object.entries(frontmatter)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
  .join('\n')}
---

${updatedNote.content}`;

    fs.writeFileSync(note.path, markdownContent, 'utf8');

    // 캐시 업데이트
    this.notesCache.set(id, updatedNote);
    
    if (this.vault) {
      const index = this.vault.notes.findIndex(n => n.id === id);
      if (index !== -1) {
        this.vault.notes[index] = updatedNote;
      }
    }

    log.info(`Updated note: ${note.path}`);
    return updatedNote;
  }

  // 노트 삭제
  async deleteNote(id: string): Promise<boolean> {
    const note = await this.getNote(id);
    if (!note) return false;

    try {
      fs.unlinkSync(note.path);
      
      // 캐시에서 제거
      this.notesCache.delete(id);
      
      if (this.vault) {
        this.vault.notes = this.vault.notes.filter(n => n.id !== id);
      }

      log.info(`Deleted note: ${note.path}`);
      return true;
    } catch (error) {
      log.error(`Failed to delete note: ${note.path}`, error);
      return false;
    }
  }

  // vault 정보 가져오기
  getVault(): ObsidianVault | null {
    return this.vault;
  }

  // 모든 노트 가져오기
  getAllNotes(): ObsidianNote[] {
    return this.vault?.notes || [];
  }

  // 태그별 노트 가져오기 (기존 메서드 - 하위 호환성)
  getNotesByTag(tag: string): ObsidianNote[] {
    return this.vault?.notes.filter(note => note.tags.includes(tag)) || [];
  }

  // 최근 작성된 노트 반환
  getRecentNotes(limit: number = 5): ObsidianNote[] {
    if (!this.vault) return [];
    return [...this.vault.notes]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // 태그별 노트 조회 (확장 버전)
  getNotesByTagWithLimit(tag: string, limit: number = 20): ObsidianNote[] {
    if (!this.vault) return [];
    return this.vault.notes
      .filter(note => note.tags.includes(tag))
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
      .slice(0, limit);
  }

  // 날짜 범위별 노트 조회
  getNotesByDateRange(startDate: Date, endDate: Date): ObsidianNote[] {
    if (!this.vault) return [];
    return this.vault.notes.filter(note => 
      note.createdAt >= startDate && note.createdAt <= endDate
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // 파일 크기별 노트 조회
  getNotesBySize(minSize: number, maxSize?: number): ObsidianNote[] {
    if (!this.vault) return [];
    return this.vault.notes.filter(note => {
      if (maxSize) {
        return note.size >= minSize && note.size <= maxSize;
      }
      return note.size >= minSize;
    }).sort((a, b) => b.size - a.size);
  }

  // 관련 노트 조회 (링크 관계 기반)
  getRelatedNotes(noteId: string, limit: number = 10): ObsidianNote[] {
    if (!this.vault) return [];
    
    const note = this.notesCache.get(noteId);
    if (!note) return [];

    const relatedNotes = new Set<ObsidianNote>();
    
    // 직접 링크된 노트들
    note.links.forEach(link => {
      if (link.type === 'internal' && link.path) {
        const linkedNote = this.vault!.notes.find(n => 
          n.title === link.target || 
          n.fileName.replace(/\.md$/, '') === link.target ||
          n.id === link.target
        );
        if (linkedNote) relatedNotes.add(linkedNote);
      }
    });

    // 백링크된 노트들
    note.backlinks.forEach(link => {
      if (link.path) {
        const backlinkedNote = this.vault!.notes.find(n => n.path === link.path);
        if (backlinkedNote) relatedNotes.add(backlinkedNote);
      }
    });

    return Array.from(relatedNotes).slice(0, limit);
  }

  // 볼트 통계 조회
  getVaultStats(): {
    totalNotes: number;
    totalAttachments: number;
    totalTemplates: number;
    totalTags: number;
    uniqueTags: string[];
    averageNoteSize: number;
    totalSize: number;
    oldestNote: Date | null;
    newestNote: Date | null;
    tagDistribution: Record<string, number>;
  } {
    if (!this.vault) {
      return {
        totalNotes: 0,
        totalAttachments: 0,
        totalTemplates: 0,
        totalTags: 0,
        uniqueTags: [],
        averageNoteSize: 0,
        totalSize: 0,
        oldestNote: null,
        newestNote: null,
        tagDistribution: {}
      };
    }

    const allTags = this.vault.notes.flatMap(note => note.tags);
    const uniqueTags = [...new Set(allTags)];
    const tagDistribution: Record<string, number> = {};
    
    allTags.forEach(tag => {
      tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
    });

    const totalSize = this.vault.notes.reduce((sum, note) => sum + note.size, 0);
    const averageNoteSize = this.vault.notes.length > 0 ? totalSize / this.vault.notes.length : 0;
    
    const dates = this.vault.notes.map(note => note.createdAt);
    const oldestNote = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const newestNote = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    return {
      totalNotes: this.vault.notes.length,
      totalAttachments: this.vault.attachments.length,
      totalTemplates: this.vault.templates.length,
      totalTags: allTags.length,
      uniqueTags,
      averageNoteSize: Math.round(averageNoteSize),
      totalSize,
      oldestNote,
      newestNote,
      tagDistribution
    };
  }

  // 사용 패턴 통계
  getUsageStats(): {
    recentlyModified: ObsidianNote[];
    mostLinkedNotes: Array<{ note: ObsidianNote; backlinkCount: number }>;
    mostUsedTags: Array<{ tag: string; count: number }>;
    largestNotes: ObsidianNote[];
  } {
    if (!this.vault) {
      return {
        recentlyModified: [],
        mostLinkedNotes: [],
        mostUsedTags: [],
        largestNotes: []
      };
    }

    const recentlyModified = [...this.vault.notes]
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
      .slice(0, 10);

    const mostLinkedNotes = this.vault.notes
      .map(note => ({ note, backlinkCount: note.backlinks.length }))
      .sort((a, b) => b.backlinkCount - a.backlinkCount)
      .slice(0, 10);

    const tagCounts = this.vault.notes.reduce((acc, note) => {
      note.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const mostUsedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const largestNotes = [...this.vault.notes]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return {
      recentlyModified,
      mostLinkedNotes,
      mostUsedTags,
      largestNotes
    };
  }

  // 중복 노트 감지
  findDuplicateNotes(): Array<{
    title: string;
    notes: ObsidianNote[];
    similarity: number;
  }> {
    if (!this.vault) return [];

    const duplicates: Array<{
      title: string;
      notes: ObsidianNote[];
      similarity: number;
    }> = [];

    const titleGroups = this.vault.notes.reduce((acc, note) => {
      const normalizedTitle = String(note.title).toLowerCase().trim();
      if (!acc[normalizedTitle]) {
        acc[normalizedTitle] = [];
      }
      acc[normalizedTitle].push(note);
      return acc;
    }, {} as Record<string, ObsidianNote[]>);

    Object.entries(titleGroups).forEach(([title, notes]) => {
      if (notes.length > 1 && notes[0] && notes[1]) {
        // 간단한 유사도 계산 (제목 기반)
        const similarity = this.calculateSimilarity(notes[0], notes[1]);
        duplicates.push({
          title,
          notes,
          similarity
        });
      }
    });

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  // 노트 유사도 계산
  private calculateSimilarity(note1: ObsidianNote, note2: ObsidianNote): number {
    const content1 = note1.content.toLowerCase();
    const content2 = note2.content.toLowerCase();
    
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]);
    
    return totalWords.size > 0 ? commonWords.length / totalWords.size : 0;
  }

  // 노트 추천 (태그 기반)
  getRecommendedNotes(noteId: string, limit: number = 5): ObsidianNote[] {
    if (!this.vault) return [];
    
    const note = this.notesCache.get(noteId);
    if (!note) return [];

    const recommendations = new Map<ObsidianNote, number>();
    
    this.vault.notes.forEach(otherNote => {
      if (otherNote.id === noteId) return;
      
      let score = 0;
      
      // 태그 일치도
      const commonTags = note.tags.filter(tag => otherNote.tags.includes(tag));
      score += commonTags.length * 10;
      
      // 제목 유사도
      if (String(note.title).toLowerCase().includes(String(otherNote.title).toLowerCase()) ||
          String(otherNote.title).toLowerCase().includes(String(note.title).toLowerCase())) {
        score += 5;
      }
      
      // 최근 수정된 노트 우선
      const daysSinceModified = (Date.now() - otherNote.modifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 7) score += 3;
      else if (daysSinceModified < 30) score += 1;
      
      if (score > 0) {
        recommendations.set(otherNote, score);
      }
    });

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([note]) => note);
  }

  // 키워드 추출
  extractKeywords(noteId: string, maxKeywords: number = 10): string[] {
    const note = this.notesCache.get(noteId);
    if (!note) return [];

    const content = note.content.toLowerCase();
    const words = content.match(/\b\w+\b/g) || [];
    
    // 불용어 제거
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const filteredWords = words.filter(word => 
      word.length > 2 && !stopWords.has(word)
    );
    
    // 단어 빈도 계산
    const wordFreq: Record<string, number> = {};
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // 빈도순 정렬
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  // 폴더 구조 분석
  analyzeFolderStructure(): {
    folders: Record<string, { noteCount: number; totalSize: number; tags: string[] }>;
    depth: number;
    largestFolders: Array<{ path: string; noteCount: number; totalSize: number }>;
  } {
    if (!this.vault) {
      return { folders: {}, depth: 0, largestFolders: [] };
    }

    const folders: Record<string, { noteCount: number; totalSize: number; tags: string[] }> = {};
    let maxDepth = 0;

    this.vault.notes.forEach(note => {
      const relativePath = note.path.replace(this.vault!.path, '').replace(/^\//, '');
      const pathParts = relativePath.split('/');
      const fileName = pathParts.pop(); // 파일명 제거
      
      let currentPath = '';
      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!folders[currentPath]) {
          folders[currentPath] = { noteCount: 0, totalSize: 0, tags: [] };
        }
        
        const folder = folders[currentPath];
        if (folder) {
          folder.noteCount++;
          folder.totalSize += note.size;
          folder.tags.push(...note.tags);
        }
        
        maxDepth = Math.max(maxDepth, index + 1);
      });
    });

    // 태그 중복 제거
    Object.values(folders).forEach(folder => {
      folder.tags = [...new Set(folder.tags)];
    });

    const largestFolders = Object.entries(folders)
      .map(([path, stats]) => ({ path, noteCount: stats.noteCount, totalSize: stats.totalSize }))
      .sort((a, b) => b.noteCount - a.noteCount)
      .slice(0, 10);

    return {
      folders,
      depth: maxDepth,
      largestFolders
    };
  }

  // 정리 제안
  suggestCleanup(): {
    orphanedNotes: ObsidianNote[];
    largeNotes: ObsidianNote[];
    untaggedNotes: ObsidianNote[];
    duplicateTitles: Array<{ title: string; notes: ObsidianNote[] }>;
  } {
    if (!this.vault) {
      return {
        orphanedNotes: [],
        largeNotes: [],
        untaggedNotes: [],
        duplicateTitles: []
      };
    }

    // 고아 노트 (링크가 없는 노트)
    const orphanedNotes = this.vault.notes.filter(note => 
      note.backlinks.length === 0 && note.links.length === 0
    );

    // 큰 노트 (1MB 이상)
    const largeNotes = this.vault.notes.filter(note => note.size > 1024 * 1024);

    // 태그가 없는 노트
    const untaggedNotes = this.vault.notes.filter(note => note.tags.length === 0);

    // 중복 제목
    const titleGroups = this.vault.notes.reduce((acc, note) => {
      const title = String(note.title).toLowerCase().trim();
      if (!acc[title]) acc[title] = [];
      acc[title].push(note);
      return acc;
    }, {} as Record<string, ObsidianNote[]>);

    const duplicateTitles = Object.entries(titleGroups)
      .filter(([_, notes]) => notes.length > 1)
      .map(([title, notes]) => ({ title, notes }));

    return {
      orphanedNotes,
      largeNotes,
      untaggedNotes,
      duplicateTitles
    };
  }

  // 종료
  async shutdown(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }
    
    this.notesCache.clear();
    this.isInitialized = false;
    
    log.info('Obsidian connector shutdown');
  }
}

export function loadObsidianConfigFromFile(): ObsidianConfig {
  const fs = require('fs');
  const path = require('path');
  
  const configPath = path.join(__dirname, '../../config/server-config.json');
  const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const obsidianConfig = serverConfig.obsidian;
  
  return {
    vaultPath: obsidianConfig.vaultPath,
    ignorePatterns: obsidianConfig.ignorePatterns || ['.DS_Store', 'node_modules', '.git'],
    includeAttachments: obsidianConfig.includeAttachments ?? true,
    watchForChanges: obsidianConfig.watchForChanges ?? true,
    maxFileSize: obsidianConfig.maxFileSize ?? 5 * 1024 * 1024 // 5MB 기본값
  };
} 