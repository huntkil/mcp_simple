import { MCPRequest, MCPResponse } from '../types/mcp-types';
import { handleProtocol } from './protocol-handler';
import { log } from '../utils/logger';

// MCP 메시지 처리 함수
export async function handleMCPMessage(message: any): Promise<MCPResponse> {
  try {
    // 메시지 검증
    if (!validateMCPMessage(message)) {
      log.error('Invalid MCP message format');
      return {
        jsonrpc: '2.0',
        id: message?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Message format is invalid'
        }
      };
    }

    // 배치 요청 처리 (여러 요청이 배열로 전송된 경우)
    if (Array.isArray(message)) {
      log.info(`Processing batch request with ${message.length} items`);
      
      const responses = await Promise.allSettled(
        message.map((request: MCPRequest, index: number) => {
          return handleProtocol(request).catch(error => {
            log.error(`Batch item ${index} failed:`, error);
            return {
              jsonrpc: '2.0',
              id: request?.id || null,
              error: {
                code: -32603,
                message: 'Internal error',
                data: error instanceof Error ? error.message : 'Unknown error'
              }
            };
          });
        })
      );

      const results = responses.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          log.error(`Batch item ${index} rejected:`, result.reason);
          return {
            jsonrpc: '2.0',
            id: message[index]?.id || null,
            error: {
              code: -32603,
              message: 'Internal error',
              data: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            }
          };
        }
      });

      return results as any; // 배치 응답은 배열 형태로 반환
    }

    // 단일 요청 처리
    log.info(`Processing single request: ${message.method || 'unknown'}`);
    return await handleProtocol(message);
    
  } catch (error) {
    log.error('Unhandled error in message handler:', error);
    
    // 에러 응답 생성
    return {
      jsonrpc: '2.0',
      id: message?.id || null,
      error: {
        code: -32603, // Internal error
        message: 'Internal server error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        }
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

  // ID 체크 (요청의 경우)
  if (message.id !== undefined && 
      typeof message.id !== 'string' && 
      typeof message.id !== 'number' && 
      message.id !== null) {
    return false;
  }

  return true;
}

// MCP 메시지 파싱 함수
export function parseMCPMessage(rawMessage: string): any {
  try {
    const parsed = JSON.parse(rawMessage);
    
    // 파싱된 메시지 검증
    if (!validateMCPMessage(parsed)) {
      throw new Error('Parsed message is invalid');
    }
    
    return parsed;
  } catch (error) {
    log.error('Failed to parse MCP message:', error);
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// MCP 메시지 직렬화 함수
export function serializeMCPMessage(message: MCPResponse): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    log.error('Failed to serialize MCP message:', error);
    throw new Error(`Failed to serialize message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 메시지 처리 통계 (디버깅용)
export interface MessageHandlerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  batchRequests: number;
  averageProcessingTime: number;
}

class MessageHandlerStatsTracker {
  private stats: MessageHandlerStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    batchRequests: 0,
    averageProcessingTime: 0
  };

  recordRequest(isBatch: boolean, processingTime: number, success: boolean): void {
    this.stats.totalRequests++;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + processingTime) / this.stats.totalRequests;
    
    if (isBatch) {
      this.stats.batchRequests++;
    }
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
  }

  getStats(): MessageHandlerStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      batchRequests: 0,
      averageProcessingTime: 0
    };
  }
}

export const messageStats = new MessageHandlerStatsTracker(); 