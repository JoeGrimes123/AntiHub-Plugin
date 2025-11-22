#!/usr/bin/env node

/**
 * 配额池自动恢复定时任务
 * 每小时执行一次，恢复用户共享配额池
 * 恢复量：每小时每模型 2n * 0.2，n为用户有效的共享cookie数
 * 
 * 使用方式：
 * 1. 单次执行：node scripts/quota-recovery-cron.js
 * 2. 添加到 crontab：0 * * * * /usr/bin/node /path/to/scripts/quota-recovery-cron.js
 */

import quotaService from '../src/services/quota.service.js';
import logger from '../src/utils/logger.js';
import database from '../src/db/database.js';

async function runQuotaRecovery() {
  try {
    logger.info('开始执行配额池自动恢复任务...');
    
    const recoveredCount = await quotaService.recoverAllUserSharedQuotas();
    
    logger.info(`配额池自动恢复任务完成！恢复了 ${recoveredCount} 条记录`);
    
    // 关闭数据库连接
    await database.end();
    
    process.exit(0);
  } catch (error) {
    logger.error('配额池自动恢复任务失败:', error);
    
    // 关闭数据库连接
    try {
      await database.end();
    } catch (endError) {
      logger.error('关闭数据库连接失败:', endError);
    }
    
    process.exit(1);
  }
}

// 执行任务
runQuotaRecovery();