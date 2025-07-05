import { ObsidianConnector } from '../connectors/obsidian-connector';
import { MongoConnector } from '../connectors/mongo-connector';
import { SearchParams, Note } from '../types/mcp-types';
import { ObsidianSearchResult } from '../types/obsidian-types';
import { MongoSearchResult } from '../types/mongo-types';

export interface HybridSearchResult {
  type: 'obsidian' | 'mongo';
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  relevance: number;
  source: any;
}

export class SearchService {
  private obsidian: ObsidianConnector;
  private mongo: MongoConnector;

  constructor(obsidian: ObsidianConnector, mongo: MongoConnector) {
    this.obsidian = obsidian;
    this.mongo = mongo;
  }

  // 통합 검색
  async hybridSearch(params: SearchParams): Promise<HybridSearchResult[]> {
    const { query, limit = 20, filters } = params;
    let obsidianResults: ObsidianSearchResult[] = [];
    let mongoResults: MongoSearchResult[] = [];

    // Obsidian 노트 검색
    if (!filters?.type || filters.type === 'note' || filters.type === 'both') {
      obsidianResults = await this.obsidian.searchNotes(query, limit);
    }

    // MongoDB 노트 검색
    if (!filters?.type || filters.type === 'mongo' || filters.type === 'both') {
      mongoResults = await this.mongo.searchNotes(query, { limit });
    }

    // 결과 변환 및 통합
    const hybridResults: HybridSearchResult[] = [];

    for (const result of obsidianResults) {
      hybridResults.push({
        type: 'obsidian',
        id: result.note.id,
        title: result.note.title,
        snippet: result.context,
        tags: result.note.tags,
        relevance: result.relevance,
        source: result.note
      });
    }

    for (const result of mongoResults) {
      const doc = result.document;
      hybridResults.push({
        type: 'mongo',
        id: doc.obsidianId || doc._id,
        title: doc.title,
        snippet: result.highlights.join(' '),
        tags: doc.tags || [],
        relevance: result.relevance,
        source: doc
      });
    }

    // 관련성 기준 정렬
    hybridResults.sort((a, b) => b.relevance - a.relevance);

    // 최종 limit 적용
    return hybridResults.slice(0, limit);
  }

  // Obsidian만 검색
  async searchObsidian(params: SearchParams): Promise<HybridSearchResult[]> {
    const { query, limit = 20 } = params;
    const obsidianResults = await this.obsidian.searchNotes(query, limit);
    return obsidianResults.map(result => ({
      type: 'obsidian',
      id: result.note.id,
      title: result.note.title,
      snippet: result.context,
      tags: result.note.tags,
      relevance: result.relevance,
      source: result.note
    }));
  }

  // MongoDB만 검색
  async searchMongo(params: SearchParams): Promise<HybridSearchResult[]> {
    const { query, limit = 20 } = params;
    const mongoResults = await this.mongo.searchNotes(query, { limit });
    return mongoResults.map(result => {
      const doc = result.document;
      return {
        type: 'mongo',
        id: doc.obsidianId || doc._id,
        title: doc.title,
        snippet: result.highlights.join(' '),
        tags: doc.tags || [],
        relevance: result.relevance,
        source: doc
      };
    });
  }
} 