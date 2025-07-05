// MongoDB 관련 타입 정의

export interface MongoConfig {
  connectionString: string;
  databaseName: string;
  collections: {
    notes: string;
    metadata: string;
    searchIndex: string;
  };
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
}

export interface MongoDocument {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface MongoNote extends MongoDocument {
  obsidianId: string;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
  searchableText: string;
  lastSync: Date;
}

export interface MongoSearchIndex extends MongoDocument {
  noteId: string;
  obsidianId: string;
  searchTerms: string[];
  relevance: number;
  lastIndexed: Date;
}

export interface MongoMetadata extends MongoDocument {
  key: string;
  value: any;
  category: string;
  description?: string | undefined;
}

export interface MongoQueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}

export interface MongoSearchResult {
  document: MongoDocument;
  relevance: number;
  matchedFields: string[];
  highlights: string[];
}

export interface MongoAggregationResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
} 