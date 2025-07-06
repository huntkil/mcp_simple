import express from 'express';
import cors from 'cors';
import { handleMCPMessage, validateMCPMessage, parseMCPMessage } from './message-handler';
import { log, configureLogger } from '../utils/logger';
import { MCPServerConfig } from '../types/mcp-types';
import calendarDemo from './google-calendar-demo';
import * as fs from 'fs';
import * as path from 'path';
import bodyParser from 'body-parser';
import { initializeConnectors } from './protocol-handler';
import * as net from 'net';

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
app.use(bodyParser.json({
  limit: '10mb',
  strict: true,
  verify: (req, res, buf) => {
    try {
      const str = buf.toString('utf8');
      // 제어 문자 제거
      const cleanStr = str.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
      JSON.parse(cleanStr);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

// JSON 파싱 에러 핸들링
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    log.error('JSON parsing error:', error);
    return res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
        data: 'Invalid JSON format (check UTF-8 encoding, control characters, and structure)'
      }
    });
  }
  next(error);
});

app.use(bodyParser.urlencoded({ extended: true }));

// CORS 설정
app.use(cors({
  origin: config.host === 'localhost' ? true : config.host,
  credentials: true
}));

// 모든 응답에 대해 UTF-8 Content-Type 명시
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

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

// 포트 사용 가능 여부 확인 함수 (개선됨)
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// 포트 사용 프로세스 종료 함수 (개선됨)
async function killProcessOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Windows에서 포트 사용 프로세스 찾기
    exec(`netstat -ano | findstr :${port}`, (error: any, stdout: string) => {
      if (error || !stdout) {
        resolve(false);
        return;
      }
      
      const lines = stdout.split('\n');
      let killedCount = 0;
      let totalProcesses = 0;
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
            totalProcesses++;
            exec(`taskkill /F /PID ${pid}`, (killError: any) => {
              if (killError) {
                log.error(`Failed to kill process ${pid}:`, killError);
              } else {
                log.info(`Successfully killed process ${pid}`);
                killedCount++;
              }
              
              // 모든 프로세스 처리 완료 후 resolve
              if (killedCount + (totalProcesses - killedCount) >= totalProcesses) {
                resolve(killedCount > 0);
              }
            });
          }
        }
      }
      
      // 프로세스가 없는 경우
      if (totalProcesses === 0) {
        resolve(false);
      }
    });
  });
}

// 사용 가능한 포트 찾기 함수
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

// 서버 시작 함수 (개선됨)
async function startServer(port: number): Promise<void> {
  try {
    // 포트 사용 가능 여부 확인
    let available = await isPortAvailable(port);
    
    if (!available) {
      log.warn(`Port ${port} is already in use. Attempting to kill existing process...`);
      
      // 기존 프로세스 종료 시도
      const killed = await killProcessOnPort(port);
      
      if (killed) {
        // 프로세스 종료 후 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 다시 포트 확인
        available = await isPortAvailable(port);
        
        if (!available) {
          log.warn(`Port ${port} is still in use after cleanup. Trying alternative port...`);
          
          // 대체 포트 찾기
          try {
            const alternativePort = await findAvailablePort(port + 1, 5);
            log.info(`Using alternative port: ${alternativePort}`);
            port = alternativePort;
          } catch (error) {
            log.error('Failed to find available port:', error);
            process.exit(1);
          }
        }
      } else {
        // 프로세스 종료 실패 시 대체 포트 사용
        try {
          const alternativePort = await findAvailablePort(port + 1, 5);
          log.info(`Using alternative port: ${alternativePort}`);
          port = alternativePort;
        } catch (error) {
          log.error('Failed to find available port:', error);
          process.exit(1);
        }
      }
    }
    
    // 서버 시작
    const server = app.listen(port, () => {
      log.info(`MCP Server is running on port ${port}`);
      
      // 서버 시작 후 추가 초기화 대기
      setTimeout(() => {
        log.info('Server initialization completed and ready to accept requests');
      }, 2000);
    });
    
    // 서버 에러 핸들링
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log.error(`Port ${port} is still in use after cleanup attempt`);
        process.exit(1);
      } else {
        log.error('Server error:', error);
      }
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      log.info('Shutting down server gracefully...');
      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      log.info('Shutting down server gracefully...');
      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

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
    log.error('Error handling MCP message:', error);
    
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
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

// 서버 초기화 및 시작
async function main() {
  try {
    await initializeConnectors();
    await startServer(config.port);
  } catch (error) {
    log.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

main();

export { app, startServer, config }; 