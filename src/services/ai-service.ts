// AIService: 완전 모킹 버전 (OpenAI 등 외부 API 불필요)

export class AIService {
  constructor() {}

  // 자연어 Q&A (Vault context 기반, mock)
  async chatWithVault(question: string, context: string[]): Promise<string> {
    return `질문: ${question}\n(모킹) 관련 노트 수: ${context.length}\n답변 예시: Vault에서 가장 관련 있는 정보를 찾아 안내합니다.`;
  }

  // 자동 태깅/분류 (mock)
  async suggestTags(noteContent: string, maxTags: number = 5): Promise<string[]> {
    // 단어 빈도 기반 임의 태그 추출
    const words = (noteContent.match(/\b\w{3,}\b/g) || []).map(w => w.toLowerCase());
    const freq: Record<string, number> = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, maxTags).map(([w]) => w);
  }

  // 의미 기반 유사도 (mock: Jaccard 유사도)
  async getEmbedding(text: string): Promise<Set<string>> {
    // 단어 집합 반환
    return new Set((text.match(/\b\w{3,}\b/g) || []).map(w => w.toLowerCase()));
  }

  static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
} 