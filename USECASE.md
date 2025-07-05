# MCP Obsidian MongoDB Server - 사용 사례 및 예제

## 📋 목차

1. [기본 설정](#기본-설정)
2. [Obsidian Vault 연동](#obsidian-vault-연동)
3. [MongoDB 연동](#mongodb-연동)
4. [통합 검색 사용법](#통합-검색-사용법)
5. [실시간 동기화](#실시간-동기화)
6. [Cursor AI IDE 연동](#cursor-ai-ide-연동)
7. [실제 사용 시나리오](#실제-사용-시나리오)

---

## 🔧 기본 설정

### 1. 프로젝트 클론 및 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd mcp-obsidian-mongo-server

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev
```

### 2. 설정 파일 구성

`config/server-config.json` 파일을 수정하세요:

```json
{
  "server": {
    "port": 4000,
    "host": "localhost",
    "logLevel": "info"
  },
  "obsidian": {
    "vaultPath": "/Users/username/Documents/ObsidianVault",
    "watchForChanges": true,
    "ignorePatterns": [
      ".obsidian/**",
      "*.temp",
      "*.tmp",
      "*.log"
    ],
    "includeAttachments": false,
    "maxFileSize": 10485760
  },
  "mongodb": {
    "connectionString": "mongodb://localhost:27017",
    "databaseName": "obsidian_mcp",
    "collections": {
      "notes": "notes",
      "metadata": "metadata",
      "searchIndex": "search_index"
    }
  }
}
```

---

## 📚 Obsidian Vault 연동

### 1. Vault 구조 예제

```
MyObsidianVault/
├── Daily Notes/
│   ├── 2024-01-15.md
│   ├── 2024-01-16.md
│   └── 2024-01-17.md
├── Projects/
│   ├── Project A/
│   │   ├── Overview.md
│   │   ├── Tasks.md
│   │   └── Notes.md
│   └── Project B/
│       ├── Requirements.md
│       └── Implementation.md
├── Knowledge Base/
│   ├── Programming/
│   │   ├── TypeScript.md
│   │   ├── Node.js.md
│   │   └── MongoDB.md
│   └── Tools/
│       ├── Obsidian.md
│       └── Cursor.md
└── Templates/
    ├── Daily Note Template.md
    └── Project Template.md
```

### 2. 마크다운 파일 예제

**Daily Notes/2024-01-15.md**
```markdown
---
title: Daily Note - 2024-01-15
tags: [daily, work, meeting]
created: 2024-01-15T09:00:00Z
---

# Daily Note - 2024-01-15

## Tasks
- [ ] Review [[Project A/Overview]]
- [ ] Update [[Knowledge Base/Programming/TypeScript]]
- [ ] Meeting with team at 2 PM

## Notes
- Discussed new features for [[Project B]]
- Need to research [[MongoDB]] aggregation pipelines
- Bookmarked useful resources in [[Tools/Obsidian]]

## Links
- Related: [[2024-01-14]], [[2024-01-16]]
- Projects: [[Project A]], [[Project B]]
```

**Knowledge Base/Programming/TypeScript.md**
```markdown
---
title: TypeScript Guide
tags: [programming, typescript, javascript]
aliases: [TS, TS Guide]
created: 2024-01-10T10:00:00Z
---

# TypeScript Guide

## Basic Types
TypeScript provides several basic types:

```typescript
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;
```

## Interfaces
Interfaces define object shapes:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

## Related Topics
- [[Node.js]] - Runtime environment
- [[MongoDB]] - Database integration
- [[Tools/Cursor]] - IDE with TypeScript support
```

### 3. 서버에서 Vault 스캔 확인

```bash
# 서버 로그에서 Vault 스캔 결과 확인
tail -f logs/combined.log | grep "Vault scan"
```

예상 출력:
```
info: Scanning Obsidian vault...
info: Vault scan completed. Notes: 25, Attachments: 3, Templates: 2
```

---

## 🗄️ MongoDB 연동

### 1. MongoDB 서버 시작

```bash
# MongoDB 서버 시작 (macOS)
brew services start mongodb-community

# 또는 Docker 사용
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. 데이터베이스 구조

MongoDB에 자동으로 생성되는 컬렉션들:

```javascript
// notes 컬렉션 예제
{
  "_id": ObjectId("..."),
  "obsidianId": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
  "title": "Project A Overview",
  "content": "# Project A Overview\n\nThis is the overview...",
  "tags": ["project", "overview", "planning"],
  "metadata": {
    "created": "2024-01-15T09:00:00Z",
    "modified": "2024-01-15T10:30:00Z"
  },
  "searchableText": "Project A Overview This is the overview...",
  "lastSync": ISODate("2024-01-15T10:30:00Z"),
  "createdAt": ISODate("2024-01-15T09:00:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z")
}

// searchIndex 컬렉션 예제
{
  "_id": ObjectId("..."),
  "noteId": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
  "obsidianId": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
  "searchTerms": ["project", "overview", "planning", "a"],
  "relevance": 4,
  "lastIndexed": ISODate("2024-01-15T10:30:00Z")
}
```

### 3. MongoDB 연결 확인

```bash
# MongoDB 연결 테스트
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_mongo_stats",
    "params": {}
  }'
```

---

## 🔍 통합 검색 사용법

### 1. 기본 검색

```bash
# 전체 검색 (Obsidian + MongoDB)
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "TypeScript",
      "limit": 10
    }
  }'
```

### 2. 필터링 검색

```bash
# 태그별 검색
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "programming",
      "filters": {
        "tags": ["typescript", "javascript"],
        "type": "both"
      },
      "limit": 5
    }
  }'
```

### 3. 날짜 범위 검색

```bash
# 최근 노트 검색
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "meeting",
      "filters": {
        "dateRange": {
          "start": "2024-01-01T00:00:00Z",
          "end": "2024-01-31T23:59:59Z"
        }
      }
    }
  }'
```

### 4. 검색 결과 예제

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "type": "obsidian",
      "id": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
      "title": "TypeScript Guide",
      "snippet": "TypeScript provides several basic types...",
      "tags": ["programming", "typescript", "javascript"],
      "relevance": 15,
      "source": {
        "id": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
        "title": "TypeScript Guide",
        "content": "# TypeScript Guide\n\nTypeScript provides...",
        "path": "/Users/username/Documents/ObsidianVault/Knowledge Base/Programming/TypeScript.md",
        "tags": ["programming", "typescript", "javascript"]
      }
    },
    {
      "type": "mongo",
      "id": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
      "title": "Node.js with TypeScript",
      "snippet": "Content: ...TypeScript integration with Node.js...",
      "tags": ["nodejs", "typescript", "backend"],
      "relevance": 12,
      "source": {
        "obsidianId": "L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==",
        "title": "Node.js with TypeScript",
        "content": "Node.js with TypeScript integration...",
        "tags": ["nodejs", "typescript", "backend"]
      }
    }
  ]
}
```

---

## 🔄 실시간 동기화

### 1. 파일 변경 감지

Obsidian에서 노트를 수정하면 자동으로 감지됩니다:

```bash
# 로그에서 실시간 변경 감지 확인
tail -f logs/combined.log | grep "File changed"
```

예상 출력:
```
info: File changed: /Users/username/Documents/ObsidianVault/Daily Notes/2024-01-15.md
info: Updated note in MongoDB: L25ldy1wcm9qZWN0L3Byb2plY3QtYS9vdmVydmlldy5tZA==
```

### 2. 새 노트 생성

Obsidian에서 새 노트를 생성하면:

```bash
# 새 노트 감지 로그
tail -f logs/combined.log | grep "New note detected"
```

### 3. 노트 삭제

Obsidian에서 노트를 삭제하면:

```bash
# 노트 삭제 감지 로그
tail -f logs/combined.log | grep "Note deleted"
```

---

## 🎯 Cursor AI IDE 연동

### 1. Cursor 설정

Cursor AI IDE에서 MCP 서버를 연결하려면:

1. **Cursor 설정 파일 생성**: `~/.cursor/settings.json`

```json
{
  "mcpServers": {
    "obsidian-mongo": {
      "command": "node",
      "args": ["/path/to/mcp-obsidian-mongo-server/dist/server/mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Cursor에서 사용 예제

Cursor AI IDE에서 다음과 같이 사용할 수 있습니다:

```
User: "내 Obsidian 노트에서 TypeScript 관련 내용을 찾아줘"

Cursor AI: MCP 서버를 통해 검색을 실행합니다...

검색 결과:
1. TypeScript Guide (Knowledge Base/Programming/TypeScript.md)
   - 기본 타입, 인터페이스, 제네릭 등 설명
   - 관련 태그: programming, typescript, javascript

2. Node.js with TypeScript (Projects/Project A/Implementation.md)
   - Node.js와 TypeScript 통합 방법
   - 관련 태그: nodejs, typescript, backend
```

### 3. AI 어시스턴트와의 대화

```
User: "프로젝트 A의 현재 상태를 요약해줘"

Cursor AI: Obsidian 노트를 분석하여 프로젝트 상태를 요약합니다...

프로젝트 A 상태 요약:
- Overview: 프로젝트 계획 및 목표 정의됨
- Tasks: 5개 작업 중 3개 완료 (60% 진행률)
- Notes: 최근 회의에서 새로운 요구사항 추가됨
- 관련 노트: 2024-01-15 Daily Note에서 언급됨
```

---

## 📖 실제 사용 시나리오

### 시나리오 1: 개발자 지식 관리

**상황**: TypeScript 프로젝트를 진행하는 개발자

**사용법**:
1. Obsidian에서 개발 노트 작성
2. MCP 서버가 실시간으로 동기화
3. Cursor AI에서 코드 관련 노트 검색
4. AI가 코드 작성 시 관련 문서 참조

**예제**:
```bash
# TypeScript 관련 노트 검색
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "interface User",
      "filters": {
        "tags": ["typescript", "code"]
      }
    }
  }'
```

### 시나리오 2: 프로젝트 관리

**상황**: 여러 프로젝트를 동시에 진행하는 PM

**사용법**:
1. 각 프로젝트별 Obsidian 폴더 구성
2. 일일 노트로 진행 상황 기록
3. MCP 서버로 프로젝트별 통계 생성
4. AI가 프로젝트 상태 분석 및 보고서 생성

**예제**:
```bash
# 프로젝트 A 관련 모든 노트 검색
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "Project A",
      "filters": {
        "dateRange": {
          "start": "2024-01-01T00:00:00Z",
          "end": "2024-01-31T23:59:59Z"
        }
      }
    }
  }'
```

### 시나리오 3: 연구 및 학습

**상황**: 새로운 기술을 학습하는 연구원

**사용법**:
1. 학습 내용을 Obsidian에 체계적으로 정리
2. 태그와 링크로 지식 연결
3. MCP 서버로 학습 진도 추적
4. AI가 학습 내용 요약 및 복습 계획 제안

**예제**:
```bash
# MongoDB 학습 노트 검색
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "MongoDB aggregation",
      "filters": {
        "tags": ["mongodb", "learning"]
      }
    }
  }'
```

---

## 🛠️ 고급 사용법

### 1. 커스텀 MCP 메서드 추가

새로운 검색 기능을 추가하려면:

```typescript
// src/server/protocol-handler.ts에 추가
export async function handleSearchByDate(params: any): Promise<any> {
  const { startDate, endDate, tags } = params;
  
  // 날짜 범위와 태그로 검색
  const results = await searchService.searchByDateRange(startDate, endDate, tags);
  
  return results;
}

// 메서드 등록
registerMethodHandler('search_by_date', handleSearchByDate);
```

### 2. 백업 및 복구

```bash
# MongoDB 백업
mongodump --db obsidian_mcp --out ./backup

# MongoDB 복구
mongorestore --db obsidian_mcp ./backup/obsidian_mcp
```

### 3. 성능 모니터링

```bash
# 서버 성능 확인
curl -X GET http://localhost:4000/health

# 로그 분석
grep "search" logs/combined.log | wc -l
grep "File changed" logs/combined.log | wc -l
```

---

## 🚨 문제 해결

### 1. 연결 문제

**문제**: MongoDB 연결 실패
```bash
# MongoDB 서버 상태 확인
brew services list | grep mongodb

# 연결 문자열 확인
cat config/server-config.json | grep connectionString
```

**해결**: MongoDB 서버 시작 및 연결 문자열 수정

### 2. 파일 권한 문제

**문제**: Obsidian Vault 접근 권한 오류
```bash
# 권한 확인
ls -la /path/to/obsidian/vault

# 권한 수정
chmod -R 755 /path/to/obsidian/vault
```

### 3. 메모리 부족

**문제**: 대용량 Vault로 인한 메모리 부족
```json
// config/server-config.json 수정
{
  "obsidian": {
    "maxFileSize": 5242880,  // 5MB로 제한
    "watchForChanges": false // 파일 감지 비활성화
  }
}
```

---

## 📊 모니터링 및 통계

### 1. 서버 상태 확인

```bash
# 실시간 로그 모니터링
tail -f logs/combined.log

# 에러 로그 확인
tail -f logs/error.log

# 서버 통계
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_stats",
    "params": {}
  }'
```

### 2. 성능 지표

- **노트 수**: 총 Obsidian 노트 개수
- **동기화 상태**: MongoDB와 동기화된 노트 비율
- **검색 성능**: 평균 검색 응답 시간
- **파일 변경 빈도**: 시간당 감지된 파일 변경 수

---

이 가이드를 따라하면 MCP Obsidian MongoDB Server를 효과적으로 활용할 수 있습니다. 추가 질문이나 문제가 있으면 GitHub Issues에 등록해 주세요! 