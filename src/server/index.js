import express from 'express';
import logger from '../utils/logger.js';
import config from '../config/config.js';
import database from '../db/database.js';
import routes from './routes.js';

const app = express();

// 初始化数据库
database.initialize(config.database);

// 检查数据库连接
database.ping().then(connected => {
  if (connected) {
    logger.info('数据库连接成功');
  } else {
    logger.error('数据库连接失败，请检查配置');
  }
});

app.use(express.json({ limit: config.security.maxRequestSize }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: `请求体过大，最大支持 ${config.security.maxRequestSize}` });
  }
  next(err);
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.request(req.method, req.path, res.statusCode, Date.now() - start);
  });
  next();
});

// 使用路由（认证在routes.js中处理）
app.use(routes);

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`服务器已启动: ${config.server.host}:${config.server.port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`端口 ${config.server.port} 已被占用`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    logger.error(`端口 ${config.server.port} 无权限访问`);
    process.exit(1);
  } else {
    logger.error('服务器启动失败:', error.message);
    process.exit(1);
  }
});

const shutdown = async () => {
  logger.info('正在关闭服务器...');
  server.close(async () => {
    await database.close();
    logger.info('服务器已关闭');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
