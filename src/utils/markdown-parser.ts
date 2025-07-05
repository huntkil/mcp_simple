import matter from 'gray-matter';
import { ObsidianNote, ObsidianLink, ObsidianFrontmatter } from '../types/obsidian-types';
import * as fs from 'fs';
import * as path from 'path';

// 마크다운 파일에서 프론트매터와 콘텐츠 분리
export function parseMarkdownFile(filePath: string): { frontmatter: ObsidianFrontmatter; content: string } {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    return {
      frontmatter: data as ObsidianFrontmatter,
      content: content.trim()
    };
  } catch (error) {
    throw new Error(`Failed to parse markdown file: ${filePath} - ${error}`);
  }
}

// 마크다운에서 링크 추출
export function extractLinks(content: string): ObsidianLink[] {
  const links: ObsidianLink[] = [];
  
  // 위키링크 패턴: [[링크명]] 또는 [[링크명|표시텍스트]]
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const linkText = match[1];
    if (linkText) {
      const [target, displayText] = linkText.split('|');
      
      if (target) {
        links.push({
          type: 'internal',
          target: target.trim(),
          displayText: displayText ? displayText.trim() : target.trim(),
          path: target.trim()
        });
      }
    }
  }
  
  // 마크다운 링크 패턴: [텍스트](URL)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const displayText = match[1];
    const url = match[2];
    
    if (displayText && url) {
      // 외부 링크인지 내부 링크인지 판단
      const isExternal = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
      
      links.push({
        type: isExternal ? 'external' : 'internal',
        target: url,
        displayText: displayText,
        path: isExternal ? undefined : url
      });
    }
  }
  
  return links;
}

// 태그 추출
export function extractTags(content: string, frontmatter: ObsidianFrontmatter): string[] {
  const tags = new Set<string>();
  
  // 프론트매터에서 태그 추출
  if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach(tag => tags.add(tag));
  }
  
  // 콘텐츠에서 태그 추출 (#태그)
  const tagRegex = /#([a-zA-Z0-9가-힣_-]+)/g;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    if (match[1]) {
      tags.add(match[1]);
    }
  }
  
  return Array.from(tags);
}

// 제목 추출
export function extractTitle(content: string, frontmatter: ObsidianFrontmatter, fileName: string): string {
  // 프론트매터에서 제목 우선
  if (frontmatter.title) {
    return frontmatter.title;
  }
  
  // 첫 번째 헤딩 찾기
  const headingRegex = /^#{1,6}\s+(.+)$/m;
  const match = content.match(headingRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // 파일명에서 확장자 제거
  return path.basename(fileName, path.extname(fileName));
}

// 노트 ID 생성
export function generateNoteId(filePath: string): string {
  // 파일 경로를 기반으로 고유 ID 생성
  const relativePath = path.relative(process.cwd(), filePath);
  return Buffer.from(relativePath).toString('base64').replace(/[+/=]/g, '');
}

// 마크다운 파일이 유효한지 확인
export function isValidMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

// 파일 크기 확인
export function checkFileSize(filePath: string, maxSize: number = 10 * 1024 * 1024): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.size <= maxSize;
  } catch (error) {
    return false;
  }
} 