import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { 
  MongoConfig, 
  MongoNote, 
  MongoSearchIndex, 
  MongoMetadata,
  MongoQueryOptions,
  MongoSearchResult,
  MongoAggregationResult,
  MongoDocument
} from '../types/mongo-types';
import { log } from '../utils/logger';

export class MongoConnector {
  private config: MongoConfig;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collections: {
    notes: Collection<MongoNote>;
    metadata: Collection<MongoMetadata>;
    searchIndex: Collection<MongoSearchIndex>;
  } | null = null;
  private isConnected = false;

  constructor(config: MongoConfig) {
    this.config = config;
  }

  // 연결 초기화
  async connect(): Promise<void> {
    try {
      log.info(`Connecting to MongoDB: ${this.config.connectionString}`);
      
      this.client = new MongoClient(this.config.connectionString, {
        maxPoolSize: this.config.options.maxPoolSize,
        serverSelectionTimeoutMS: this.config.options.serverSelectionTimeoutMS,
        socketTimeoutMS: this.config.options.socketTimeoutMS
      });

      await this.client.connect();
      this.db = this.client.db(this.config.databaseName);
      
      // 컬렉션 초기화
      this.collections = {
        notes: this.db.collection(this.config.collections.notes),
        metadata: this.db.collection(this.config.collections.metadata),
        searchIndex: this.db.collection(this.config.collections.searchIndex)
      };

      // 인덱스 생성
      await this.createIndexes();

      this.isConnected = true;
      log.info(`MongoDB connected successfully to database: ${this.config.databaseName}`);

    } catch (error) {
      log.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // 인덱스 생성
  private async createIndexes(): Promise<void> {
    if (!this.collections) return;

    try {
      log.info('Creating MongoDB indexes...');

      // notes 컬렉션 인덱스
      await this.collections.notes.createIndex(
        { obsidianId: 1 }, 
        { unique: true, name: 'obsidian_id_unique' }
      );

      await this.collections.notes.createIndex(
        { title: 'text', content: 'text', searchableText: 'text' },
        { name: 'text_search' }
      );

      await this.collections.notes.createIndex(
        { tags: 1 },
        { name: 'tags_index' }
      );

      await this.collections.notes.createIndex(
        { lastSync: -1 },
        { name: 'last_sync_index' }
      );

      // searchIndex 컬렉션 인덱스
      await this.collections.searchIndex.createIndex(
        { noteId: 1 },
        { unique: true, name: 'note_id_unique' }
      );

      await this.collections.searchIndex.createIndex(
        { searchTerms: 1 },
        { name: 'search_terms_index' }
      );

      log.info('MongoDB indexes created successfully');

    } catch (error) {
      log.error('Failed to create indexes:', error);
      throw error;
    }
  }

  // 연결 상태 확인
  isConnectedToDb(): boolean {
    return this.isConnected && this.client !== null;
  }

  // 노트 저장/업데이트
  async upsertNote(note: MongoNote): Promise<void> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const filter = { obsidianId: note.obsidianId };
      const update = {
        $set: {
          ...note,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      };

      const result = await this.collections.notes.updateOne(filter, update, { upsert: true });
      
      if (result.upsertedCount > 0) {
        log.info(`Created new note in MongoDB: ${note.obsidianId}`);
      } else {
        log.info(`Updated note in MongoDB: ${note.obsidianId}`);
      }

    } catch (error) {
      log.error(`Failed to upsert note: ${note.obsidianId}`, error);
      throw error;
    }
  }

  // 노트 조회
  async getNote(obsidianId: string): Promise<MongoNote | null> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const note = await this.collections.notes.findOne({ obsidianId });
      return note;
    } catch (error) {
      log.error(`Failed to get note: ${obsidianId}`, error);
      throw error;
    }
  }

  // 노트 삭제
  async deleteNote(obsidianId: string): Promise<boolean> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const result = await this.collections.notes.deleteOne({ obsidianId });
      
      if (result.deletedCount > 0) {
        // 관련 검색 인덱스도 삭제
        await this.collections.searchIndex.deleteOne({ obsidianId });
        log.info(`Deleted note from MongoDB: ${obsidianId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error(`Failed to delete note: ${obsidianId}`, error);
      throw error;
    }
  }

  // 노트 검색
  async searchNotes(query: string, options: MongoQueryOptions = {}): Promise<MongoSearchResult[]> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const { limit = 20, skip = 0, sort = { _score: { $meta: 'textScore' } } } = options;

      // 텍스트 검색
      const searchQuery = {
        $text: { $search: query }
      };

      const pipeline = [
        { $match: searchQuery },
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
      ];

      const results = await this.collections.notes.aggregate(pipeline).toArray();

      return results.map(doc => ({
        document: doc as MongoDocument,
        relevance: doc.score || 0,
        matchedFields: ['title', 'content', 'searchableText'],
        highlights: this.extractHighlights(doc, query)
      }));

    } catch (error) {
      log.error(`Failed to search notes: ${query}`, error);
      throw error;
    }
  }

  // 하이라이트 추출
  private extractHighlights(doc: any, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(' ');

    // 제목에서 하이라이트
    if (doc.title) {
      const titleLower = doc.title.toLowerCase();
      queryTerms.forEach(term => {
        if (titleLower.includes(term)) {
          highlights.push(`Title: ${doc.title}`);
          return;
        }
      });
    }

    // 콘텐츠에서 하이라이트
    if (doc.content) {
      const contentLower = doc.content.toLowerCase();
      queryTerms.forEach(term => {
        const index = contentLower.indexOf(term);
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(doc.content.length, index + term.length + 50);
          const highlight = doc.content.substring(start, end).trim();
          highlights.push(`Content: ...${highlight}...`);
        }
      });
    }

    return highlights.slice(0, 3); // 최대 3개 하이라이트
  }

  // 태그별 노트 조회
  async getNotesByTag(tag: string, options: MongoQueryOptions = {}): Promise<MongoNote[]> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;

      const notes = await this.collections.notes
        .find({ tags: tag })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      return notes;
    } catch (error) {
      log.error(`Failed to get notes by tag: ${tag}`, error);
      throw error;
    }
  }

  // 집계 쿼리
  async aggregateNotes(pipeline: any[], options: MongoQueryOptions = {}): Promise<MongoAggregationResult> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const { limit = 20, skip = 0 } = options;

      // 카운트 파이프라인
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.collections.notes.aggregate(countPipeline).toArray();
      const total = countResult.length > 0 ? (countResult[0]?.total || 0) : 0;

      // 데이터 파이프라인
      const dataPipeline = [
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ];

      const data = await this.collections.notes.aggregate(dataPipeline).toArray();

      return {
        data,
        total,
        page: Math.floor(skip / limit) + 1,
        limit
      };

    } catch (error) {
      log.error('Failed to aggregate notes:', error);
      throw error;
    }
  }

  // 검색 인덱스 업데이트
  async updateSearchIndex(obsidianId: string, searchTerms: string[]): Promise<void> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const searchIndex: MongoSearchIndex = {
        noteId: obsidianId,
        obsidianId,
        searchTerms,
        relevance: searchTerms.length,
        lastIndexed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const filter = { obsidianId };
      const update = {
        $set: {
          ...searchIndex,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      };

      await this.collections.searchIndex.updateOne(filter, update, { upsert: true });
      log.debug(`Updated search index for note: ${obsidianId}`);

    } catch (error) {
      log.error(`Failed to update search index: ${obsidianId}`, error);
      throw error;
    }
  }

  // 메타데이터 저장
  async setMetadata(key: string, value: any, category: string = 'general', description?: string): Promise<void> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const metadata: MongoMetadata = {
        key,
        value,
        category,
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const filter = { key };
      const update = {
        $set: {
          ...metadata,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      };

      await this.collections.metadata.updateOne(filter, update, { upsert: true });
      log.debug(`Set metadata: ${key} = ${JSON.stringify(value)}`);

    } catch (error) {
      log.error(`Failed to set metadata: ${key}`, error);
      throw error;
    }
  }

  // 메타데이터 조회
  async getMetadata(key: string): Promise<any> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const metadata = await this.collections.metadata.findOne({ key });
      return metadata?.value || null;
    } catch (error) {
      log.error(`Failed to get metadata: ${key}`, error);
      throw error;
    }
  }

  // 카테고리별 메타데이터 조회
  async getMetadataByCategory(category: string): Promise<MongoMetadata[]> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const metadata = await this.collections.metadata
        .find({ category })
        .sort({ updatedAt: -1 })
        .toArray();

      return metadata;
    } catch (error) {
      log.error(`Failed to get metadata by category: ${category}`, error);
      throw error;
    }
  }

  // 통계 정보 조회
  async getStats(): Promise<{
    totalNotes: number;
    totalTags: number;
    lastSync: Date | null;
    averageNoteSize: number;
  }> {
    if (!this.collections) {
      throw new Error('MongoDB not connected');
    }

    try {
      const totalNotes = await this.collections.notes.countDocuments();
      
      const tagStats = await this.collections.notes.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags' } },
        { $count: 'total' }
      ]).toArray();
      
      const totalTags = tagStats.length > 0 ? (tagStats[0]?.total || 0) : 0;

      const lastSyncNote = await this.collections.notes
        .find()
        .sort({ lastSync: -1 })
        .limit(1)
        .toArray();

      const lastSync = lastSyncNote.length > 0 ? lastSyncNote[0]?.lastSync || null : null;

      const sizeStats = await this.collections.notes.aggregate([
        { $group: { _id: null, avgSize: { $avg: { $strLenCP: '$content' } } } }
      ]).toArray();

      const averageNoteSize = sizeStats.length > 0 ? Math.round(sizeStats[0]?.avgSize || 0) : 0;

      return {
        totalNotes,
        totalTags,
        lastSync,
        averageNoteSize
      };

    } catch (error) {
      log.error('Failed to get stats:', error);
      throw error;
    }
  }

  // 연결 종료
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collections = null;
      this.isConnected = false;
      log.info('MongoDB disconnected');
    }
  }
} 