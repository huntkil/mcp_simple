import { ObsidianConnector } from '../connectors/obsidian-connector';
import { SearchParams, Note } from '../types/mcp-types';
import { ObsidianSearchResult } from '../types/obsidian-types';

export interface SearchResult {
  type: 'obsidian';
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  relevance: number;
  source: any;
}

export class SearchService {
  private obsidian: ObsidianConnector;

  constructor(obsidian: ObsidianConnector) {
    this.obsidian = obsidian;
  }

  // Obsidian 검색
  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, limit = 20, filters } = params;
    
    // Obsidian 노트 검색
    const obsidianResults = await this.obsidian.searchNotes(query, limit);

    // 결과 변환
    const searchResults: SearchResult[] = [];

    for (const result of obsidianResults) {
      searchResults.push({
        type: 'obsidian',
        id: result.note.id,
        title: result.note.title,
        snippet: result.context,
        tags: result.note.tags,
        relevance: result.relevance,
        source: result.note
      });
    }

    // 관련성 기준 정렬
    searchResults.sort((a, b) => b.relevance - a.relevance);

    // 최종 limit 적용
    return searchResults.slice(0, limit);
  }

  // Obsidian 검색 (별칭 메소드)
  async searchObsidian(params: SearchParams): Promise<SearchResult[]> {
    return this.search(params);
  }
} 