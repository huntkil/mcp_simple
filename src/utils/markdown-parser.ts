import matter from 'gray-matter';
import { ObsidianNote, ObsidianLink, ObsidianFrontmatter } from '../types/obsidian-types';
import * as fs from 'fs';
import * as path from 'path';

// 마크다운 파일에서 프론트매터와 콘텐츠 분리 (한글 인코딩 개선)
export function parseMarkdownFile(filePath: string): { frontmatter: ObsidianFrontmatter; content: string } {
  try {
    // 한글 파일명 처리를 위한 인코딩 명시
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
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

// 태그 추출 (한글 태그 지원 개선)
export function extractTags(content: string, frontmatter: ObsidianFrontmatter): string[] {
  const tags = new Set<string>();
  
  // 프론트매터에서 태그 추출
  if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach(tag => tags.add(tag));
  }
  
  // 콘텐츠에서 태그 추출 (#태그) - 한글 태그 지원
  const tagRegex = /#([a-zA-Z0-9가-힣\u3131-\u318E\uAC00-\uD7A3_-]+)/g;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    if (match[1]) {
      tags.add(match[1]);
    }
  }
  
  return Array.from(tags);
}

// 제목 추출 (한글 제목 지원 개선)
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
  
  // 파일명에서 확장자 제거 (한글 파일명 처리 개선)
  const baseName = path.basename(fileName, path.extname(fileName));
  
  // 파일명이 깨진 경우 디코딩 시도
  try {
    // URL 디코딩 시도
    const decodedName = decodeURIComponent(baseName);
    if (decodedName !== baseName) {
      return decodedName;
    }
    
    // Buffer 디코딩 시도
    const buffer = Buffer.from(baseName, 'latin1');
    const utf8Name = buffer.toString('utf8');
    if (utf8Name !== baseName && /[가-힣]/.test(utf8Name)) {
      return utf8Name;
    }
  } catch (error) {
    // 디코딩 실패 시 원본 반환
  }
  
  return baseName;
}

// 노트 ID 생성 (한글 파일명 지원)
export function generateNoteId(filePath: string): string {
  try {
    // 파일 경로를 기반으로 고유 ID 생성
    const relativePath = path.relative(process.cwd(), filePath);
    
    // 한글 파일명 처리를 위해 UTF-8 인코딩 사용
    const buffer = Buffer.from(relativePath, 'utf8');
    return buffer.toString('base64').replace(/[+/=]/g, '');
  } catch (error) {
    // 폴백: 파일명만 사용
    const fileName = path.basename(filePath);
    const buffer = Buffer.from(fileName, 'utf8');
    return buffer.toString('base64').replace(/[+/=]/g, '');
  }
}

// 마크다운 파일이 유효한지 확인
export function isValidMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

// 파일 크기 확인 (한글 파일명 지원)
export function checkFileSize(filePath: string, maxSize: number = 10 * 1024 * 1024): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.size <= maxSize;
  } catch (error) {
    return false;
  }
}

// 한글 파일명 정규화 함수 (새로 추가)
export function normalizeKoreanFileName(fileName: string): string {
  try {
    // 파일명이 이미 정상적인 한글로 보이는 경우
    if (/[가-힣]/.test(fileName)) {
      return fileName;
    }
    
    // 깨진 한글 파일명 복구 시도
    const buffer = Buffer.from(fileName, 'latin1');
    const utf8Name = buffer.toString('utf8');
    
    // UTF-8로 변환된 결과가 한글을 포함하는 경우
    if (/[가-힣]/.test(utf8Name)) {
      return utf8Name;
    }
    
    // URL 디코딩 시도
    try {
      const decodedName = decodeURIComponent(fileName);
      if (/[가-힣]/.test(decodedName)) {
        return decodedName;
      }
    } catch (error) {
      // URL 디코딩 실패
    }
    
    // 모든 시도 실패 시 원본 반환
    return fileName;
  } catch (error) {
    return fileName;
  }
}

// 안전한 파일명 생성 함수 (새로 추가)
export function createSafeFileName(title: string): string {
  try {
    // 한글 파일명 정규화
    let safeName = normalizeKoreanFileName(title);
    
    // Windows 파일명 제한 문자 제거
    safeName = safeName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    
    // 연속 공백을 단일 공백으로
    safeName = safeName.replace(/\s+/g, ' ').trim();
    
    // 파일명이 비어있거나 너무 짧은 경우
    if (!safeName || safeName.length < 1) {
      safeName = 'Untitled';
    }
    
    // 파일명 길이 제한 (Windows 경로 제한 고려)
    const maxFileNameLength = 240; // .md 확장자 고려
    if (safeName.length > maxFileNameLength) {
      safeName = safeName.substring(0, maxFileNameLength);
    }
    
    // 파일명 끝의 공백 및 점 제거 (Windows 제한)
    safeName = safeName.replace(/[.\s]+$/, '');
    
    // 파일명이 비어있으면 기본값 설정
    if (!safeName) {
      safeName = 'Untitled';
    }
    
    return safeName;
  } catch (error) {
    return 'Untitled';
  }
} 