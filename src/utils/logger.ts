import winston from 'winston';
import path from 'path';

// 로그 레벨 정의
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 로그 레벨에 따른 색상 정의
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 색상 활성화
winston.addColors(colors);

// 로그 포맷 정의
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 로그 파일 경로
const logDir = path.join(process.cwd(), 'logs');

// 트랜스포트 설정
const transports = [
  // 콘솔 출력
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // 에러 로그 파일
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // 전체 로그 파일
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// 로거 인스턴스 생성
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// 로거 설정 함수
export function configureLogger(level: string = 'info'): void {
  logger.level = level;
  logger.info(`Logger configured with level: ${level}`);
}

// 로거 메서드 래퍼
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  }
};

// MCP 전용 로거
export const mcpLogger = {
  request: (method: string, params?: any) => {
    logger.info(`MCP Request: ${method}`, { params });
  },
  response: (method: string, result?: any) => {
    logger.info(`MCP Response: ${method}`, { result });
  },
  error: (method: string, error: any) => {
    logger.error(`MCP Error in ${method}:`, error);
  }
}; 