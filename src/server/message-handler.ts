import { MCPRequest, MCPResponse } from '../types/mcp-types';
import { handleProtocol } from './protocol-handler';
import { mcpLogger } from '../utils/logger';

// MCP 메시지 처리 함수
export async function handleMCPMessage(message: any): Promise<MCPResponse> {
  try {
    // 배치 요청 처리 (여러 요청이 배열로 전송된 경우)
    if (Array.isArray(message)) {
      const responses = await Promise.all(
        message.map((request: MCPRequest) => handleProtocol(request))
      );
      return responses as any; // 배치 응답은 배열 형태로 반환
    }

    // 단일 요청 처리
    return await handleProtocol(message);
  } catch (error) {
    mcpLogger.error('message_handler', error);
    
    // 에러 응답 생성
    return {
      jsonrpc: '2.0',
      id: message?.id || null,
      error: {
        code: -32603, // Internal error
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// MCP 메시지 검증 함수
export function validateMCPMessage(message: any): boolean {
  // null 체크
  if (message === null || message === undefined) {
    return false;
  }

  // 객체 체크
  if (typeof message !== 'object') {
    return false;
  }

  // JSON-RPC 버전 체크
  if (message.jsonrpc !== '2.0') {
    return false;
  }

  // 메서드 체크 (요청의 경우)
  if (message.method !== undefined && typeof message.method !== 'string') {
    return false;
  }

  return true;
}

// MCP 메시지 파싱 함수
export function parseMCPMessage(rawMessage: string): any {
  try {
    return JSON.parse(rawMessage);
  } catch (error) {
    mcpLogger.error('parse_message', error);
    throw new Error('Invalid JSON format');
  }
}

// MCP 메시지 직렬화 함수
export function serializeMCPMessage(message: MCPResponse): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    mcpLogger.error('serialize_message', error);
    throw new Error('Failed to serialize message');
  }
} 