import chokidar from 'chokidar';
import { log } from './logger';
import { ObsidianFileWatcher } from '../types/obsidian-types';
import * as path from 'path';

export interface FileWatcherOptions {
  path: string;
  ignorePatterns: string[];
  onFileChange: (event: ObsidianFileWatcher) => void;
  onFileAdd: (event: ObsidianFileWatcher) => void;
  onFileDelete: (event: ObsidianFileWatcher) => void;
  onDirectoryAdd?: (event: ObsidianFileWatcher) => void;
  onDirectoryDelete?: (event: ObsidianFileWatcher) => void;
}

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private options: FileWatcherOptions;
  private processedEvents: Set<string> = new Set();
  private eventQueue: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 5000; // 5초로 증가
  private readonly EVENT_CLEANUP_INTERVAL = 30000; // 30초로 단축
  private readonly MAX_EVENT_HISTORY = 1000; // 최대 이벤트 히스토리 제한

  constructor(options: FileWatcherOptions) {
    this.options = options;
    this.startEventCleanup();
  }

  // 이벤트 히스토리 정리 (개선됨)
  private startEventCleanup(): void {
    setInterval(() => {
      // 이벤트 히스토리가 너무 많으면 정리
      if (this.processedEvents.size > this.MAX_EVENT_HISTORY) {
        this.processedEvents.clear();
        log.debug('File watcher event history cleared due to size limit');
      } else {
        // 일정 시간이 지난 이벤트만 정리
        this.processedEvents.clear();
        log.debug('File watcher event history cleared');
      }
    }, this.EVENT_CLEANUP_INTERVAL);
  }

  // 이벤트 디바운싱 처리 (개선됨)
  private debounceEvent(eventKey: string, eventHandler: () => void): void {
    // 이미 처리된 이벤트인지 확인
    if (this.processedEvents.has(eventKey)) {
      log.debug(`Skipping already processed event: ${eventKey}`);
      return;
    }

    // 기존 타이머가 있으면 취소
    if (this.eventQueue.has(eventKey)) {
      clearTimeout(this.eventQueue.get(eventKey)!);
      log.debug(`Cancelled existing timer for event: ${eventKey}`);
    }

    // 새로운 타이머 설정
    const timer = setTimeout(() => {
      try {
        // 다시 한번 중복 확인
        if (this.processedEvents.has(eventKey)) {
          log.debug(`Event already processed during debounce: ${eventKey}`);
          return;
        }

        eventHandler();
        this.processedEvents.add(eventKey);
        this.eventQueue.delete(eventKey);
        log.debug(`Successfully processed debounced event: ${eventKey}`);
      } catch (error) {
        log.error(`Error in debounced event handler for ${eventKey}:`, error);
        this.eventQueue.delete(eventKey);
      }
    }, this.DEBOUNCE_DELAY);

    this.eventQueue.set(eventKey, timer);
    log.debug(`Scheduled debounced event: ${eventKey} (${this.DEBOUNCE_DELAY}ms)`);
  }

  // 이벤트 키 생성 (개선됨)
  private generateEventKey(event: string, filePath: string): string {
    // 파일 경로를 정규화하여 더 정확한 키 생성
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return `${event}:${normalizedPath}`;
  }

  // 파일 감시 시작
  start(): void {
    try {
      log.info(`Starting file watcher for: ${this.options.path}`);

      this.watcher = chokidar.watch(this.options.path, {
        ignored: this.options.ignorePatterns,
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 5000, // 5초로 증가
          pollInterval: 300 // 폴링 간격 증가
        },
        usePolling: false,
        interval: 300, // 간격 증가
        binaryInterval: 800, // 바이너리 간격 증가
        alwaysStat: true,
        depth: 99,
        followSymlinks: true,
        atomic: true, // 원자적 쓰기 감지
        ignorePermissionErrors: true, // 권한 에러 무시
        useFsEvents: false, // macOS에서 fs-events 비활성화
        disableGlobbing: false // 글로빙 활성화
      });

      // 이벤트 리스너 등록
      this.watcher
        .on('add', (filePath, stats) => {
          const eventKey = this.generateEventKey('add', filePath);
          
          // 이미 처리된 이벤트인지 확인
          if (this.processedEvents.has(eventKey)) {
            log.debug(`Skipping duplicate add event: ${filePath}`);
            return;
          }

          log.debug(`File added: ${filePath}`);
          this.debounceEvent(eventKey, () => {
            this.options.onFileAdd({
              path: filePath,
              event: 'add',
              stats
            });
          });
        })
        .on('change', (filePath, stats) => {
          const eventKey = this.generateEventKey('change', filePath);
          
          // 이미 처리된 이벤트인지 확인
          if (this.processedEvents.has(eventKey)) {
            log.debug(`Skipping duplicate change event: ${filePath}`);
            return;
          }

          log.debug(`File changed: ${filePath}`);
          this.debounceEvent(eventKey, () => {
            this.options.onFileChange({
              path: filePath,
              event: 'change',
              stats
            });
          });
        })
        .on('unlink', (filePath) => {
          const eventKey = this.generateEventKey('unlink', filePath);
          
          // 이미 처리된 이벤트인지 확인
          if (this.processedEvents.has(eventKey)) {
            log.debug(`Skipping duplicate unlink event: ${filePath}`);
            return;
          }

          log.debug(`File deleted: ${filePath}`);
          this.debounceEvent(eventKey, () => {
            this.options.onFileDelete({
              path: filePath,
              event: 'unlink'
            });
          });
        })
        .on('addDir', (dirPath, stats) => {
          const eventKey = this.generateEventKey('addDir', dirPath);
          
          if (this.processedEvents.has(eventKey)) {
            log.debug(`Skipping duplicate addDir event: ${dirPath}`);
            return;
          }

          log.debug(`Directory added: ${dirPath}`);
          if (this.options.onDirectoryAdd) {
            this.debounceEvent(eventKey, () => {
              this.options.onDirectoryAdd!({
                path: dirPath,
                event: 'addDir',
                stats
              });
            });
          }
        })
        .on('unlinkDir', (dirPath) => {
          const eventKey = this.generateEventKey('unlinkDir', dirPath);
          
          if (this.processedEvents.has(eventKey)) {
            log.debug(`Skipping duplicate unlinkDir event: ${dirPath}`);
            return;
          }

          log.debug(`Directory deleted: ${dirPath}`);
          if (this.options.onDirectoryDelete) {
            this.debounceEvent(eventKey, () => {
              this.options.onDirectoryDelete!({
                path: dirPath,
                event: 'unlinkDir'
              });
            });
          }
        })
        .on('error', (error) => {
          log.error('File watcher error:', error);
        })
        .on('ready', () => {
          log.info('File watcher ready');
        })
        .on('raw', (event, path, details) => {
          // 원시 이벤트 로깅 (디버깅용)
          log.debug(`Raw event: ${event} for ${path}`);
        });

    } catch (error) {
      log.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  // 파일 감시 중지
  stop(): void {
    if (this.watcher) {
      log.info('Stopping file watcher');
      
      // 모든 타이머 정리
      this.eventQueue.forEach((timer) => {
        clearTimeout(timer);
      });
      this.eventQueue.clear();
      this.processedEvents.clear();
      
      this.watcher.close();
      this.watcher = null;
    }
  }

  // 특정 파일/디렉토리 추가 감시
  add(path: string): void {
    if (this.watcher) {
      this.watcher.add(path);
    }
  }

  // 특정 파일/디렉토리 감시 제거
  unwatch(path: string): void {
    if (this.watcher) {
      this.watcher.unwatch(path);
    }
  }

  // 현재 감시 중인 파일 목록 가져오기
  getWatched(): Record<string, string[]> {
    if (this.watcher) {
      return this.watcher.getWatched();
    }
    return {};
  }

  // 감시 상태 확인
  isWatching(): boolean {
    return this.watcher !== null;
  }

  // 이벤트 큐 상태 확인 (디버깅용)
  getEventQueueStatus(): { queueSize: number; processedEvents: number } {
    return {
      queueSize: this.eventQueue.size,
      processedEvents: this.processedEvents.size
    };
  }
} 