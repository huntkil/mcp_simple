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

  constructor(options: FileWatcherOptions) {
    this.options = options;
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
          stabilityThreshold: 2000,
          pollInterval: 100
        },
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        alwaysStat: true,
        depth: 99,
        followSymlinks: true
      });

      // 이벤트 리스너 등록
      this.watcher
        .on('add', (filePath, stats) => {
          log.debug(`File added: ${filePath}`);
          this.options.onFileAdd({
            path: filePath,
            event: 'add',
            stats
          });
        })
        .on('change', (filePath, stats) => {
          log.debug(`File changed: ${filePath}`);
          this.options.onFileChange({
            path: filePath,
            event: 'change',
            stats
          });
        })
        .on('unlink', (filePath) => {
          log.debug(`File deleted: ${filePath}`);
          this.options.onFileDelete({
            path: filePath,
            event: 'unlink'
          });
        })
        .on('addDir', (dirPath, stats) => {
          log.debug(`Directory added: ${dirPath}`);
          if (this.options.onDirectoryAdd) {
            this.options.onDirectoryAdd({
              path: dirPath,
              event: 'addDir',
              stats
            });
          }
        })
        .on('unlinkDir', (dirPath) => {
          log.debug(`Directory deleted: ${dirPath}`);
          if (this.options.onDirectoryDelete) {
            this.options.onDirectoryDelete({
              path: dirPath,
              event: 'unlinkDir'
            });
          }
        })
        .on('error', (error) => {
          log.error('File watcher error:', error);
        })
        .on('ready', () => {
          log.info('File watcher ready');
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
} 