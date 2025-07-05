import express from 'express';
import cors from 'cors';
import { handleMCPMessage, validateMCPMessage, parseMCPMessage } from './message-handler';
import { log, configureLogger } from '../utils/logger';
import { MCPServerConfig } from '../types/mcp-types';
import calendarDemo from './google-calendar-demo';
import * as fs from 'fs';
import * as path from 'path';

// 설정 파일 로드
function loadConfig(): MCPServerConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'server-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    return {
      port: config.server.port || 4000,
      host: config.server.host || 'localhost',
      logLevel: config.server.logLevel || 'info',
      obsidianVaultPath: config.obsidian.vaultPath || ''
    };
  } catch (error) {
    log.error('Failed to load config', error);
    // 기본 설정 반환
    return {
      port: 4000,
      host: 'localhost',
      logLevel: 'info'
    };
  }
}

// Express 앱 생성
const app = express();
const config = loadConfig();

// 로거 설정
configureLogger(config.logLevel);

// 미들웨어 설정
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS 설정
app.use(cors({
  origin: config.host === 'localhost' ? true : config.host,
  credentials: true
}));

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Google Calendar 데모 라우터
app.use('/api/calendar', calendarDemo);

// MCP 엔드포인트
app.post('/mcp', async (req, res) => {
  try {
    const rawMessage = req.body;
    
    // 메시지 검증
    if (!validateMCPMessage(rawMessage)) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: rawMessage?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      });
      return;
    }

    // MCP 메시지 처리
    const response = await handleMCPMessage(rawMessage);
    
    // 응답 전송
    res.json(response);
    
  } catch (error) {
    log.error('MCP endpoint error', error);
    
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: 'Internal Error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// 에러 핸들링 미들웨어
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('Express error', error);
  
  res.status(500).json({
    jsonrpc: '2.0',
    id: req.body?.id || null,
    error: {
      code: -32603,
      message: 'Internal Server Error'
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    jsonrpc: '2.0',
    id: req.body?.id || null,
    error: {
      code: -32601,
      message: 'Method not found'
    }
  });
});

// 서버 시작
function startServer(): void {
  const server = app.listen(config.port, config.host, () => {
    log.info(`MCP Server started on http://${config.host}:${config.port}`);
    log.info(`Health check: http://${config.host}:${config.port}/health`);
    log.info(`MCP endpoint: http://${config.host}:${config.port}/mcp`);
    log.info(`Google Calendar API: http://${config.host}:${config.port}/api/calendar`);
  });

  // 서버 종료 처리
  process.on('SIGINT', () => {
    log.info('Shutting down MCP server...');
    server.close(() => {
      log.info('MCP server stopped');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    log.info('Shutting down MCP server...');
    server.close(() => {
      log.info('MCP server stopped');
      process.exit(0);
    });
  });

  // 예상치 못한 에러 처리
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
  });
}

// 서버 시작 (모듈이 직접 실행된 경우)
if (require.main === module) {
  startServer();
}

export { app, startServer, config }; 