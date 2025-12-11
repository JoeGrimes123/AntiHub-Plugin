import https from 'https';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import redisService from './redis.service.js';

/**
 * AWS SSO OIDC endpoints
 */
const AWS_SSO_OIDC_ENDPOINT = 'https://oidc.us-east-1.amazonaws.com';
const BUILDER_ID_START_URL = 'https://view.awsapps.com/start';
const KIRO_REDIRECT_URI = 'kiro://kiro.kiroAgent/authenticate-success';
const KIRO_IDE_VERSION = '0.6.18';

/**
 * AWS Builder ID Redis Key prefix
 */
const AWS_BUILDER_OAUTH_KEY_PREFIX = 'kiro:aws-builder:state:';

class KiroAWSBuilderService {
  /**
   * Generate random UUID
   * @returns {string} UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate random 32-byte hex string for machineid
   * @returns {string} machineid (32 bytes hex)
   */
  generateMachineId() {
    return crypto.randomBytes(32).toString('hex').toLowerCase();
  }

  /**
   * Generate PKCE code_verifier
   * @returns {string} code_verifier (base64url encoded)
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code_challenge
   * @param {string} codeVerifier - code_verifier
   * @returns {string} code_challenge (base64url encoded SHA256 hash)
   */
  generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest().toString('base64url');
  }

  /**
   * Register OIDC client with AWS SSO
   * @returns {Promise<Object>} { clientId, clientSecret, clientIdIssuedAt, clientSecretExpiresAt }
   */
  async registerClient() {
    const requestId = crypto.randomUUID().substring(0, 8);
    logger.info(`[${requestId}] Registering AWS SSO OIDC client`);

    const clientName = `CLI-Proxy-API-${Date.now()}`;
    const payload = {
      clientName,
      clientType: 'public',
      scopes: ['codewhisperer:completions', 'codewhisperer:analysis', 'codewhisperer:conversations']
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const options = {
        hostname: 'oidc.us-east-1.amazonaws.com',
        path: '/client/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              logger.info(`[${requestId}] Client registered successfully: ${data.clientId}`);
              resolve({
                clientId: data.clientId,
                clientSecret: data.clientSecret,
                clientIdIssuedAt: data.clientIdIssuedAt,
                clientSecretExpiresAt: data.clientSecretExpiresAt
              });
            } catch (error) {
              logger.error(`[${requestId}] JSON parse error:`, error.message);
              reject(new Error(`JSON parse error: ${error.message}`));
            }
          } else {
            logger.error(`[${requestId}] Registration failed: HTTP ${res.statusCode} - ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error(`[${requestId}] Request error:`, error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Start device authorization flow
   * @param {string} clientId - OIDC client ID
   * @param {string} clientSecret - OIDC client secret
   * @returns {Promise<Object>} Device authorization response
   */
  async startDeviceAuthorization(clientId, clientSecret) {
    const requestId = crypto.randomUUID().substring(0, 8);
    logger.info(`[${requestId}] Starting device authorization`);

    const payload = {
      clientId,
      clientSecret,
      startUrl: BUILDER_ID_START_URL
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const options = {
        hostname: 'oidc.us-east-1.amazonaws.com',
        path: '/device_authorization',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              logger.info(`[${requestId}] Device authorization started: ${data.deviceCode}`);
              resolve({
                deviceCode: data.deviceCode,
                userCode: data.userCode,
                verificationUri: data.verificationUri,
                verificationUriComplete: data.verificationUriComplete,
                expiresIn: data.expiresIn,
                interval: data.interval
              });
            } catch (error) {
              logger.error(`[${requestId}] JSON parse error:`, error.message);
              reject(new Error(`JSON parse error: ${error.message}`));
            }
          } else {
            logger.error(`[${requestId}] Device authorization failed: HTTP ${res.statusCode} - ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error(`[${requestId}] Request error:`, error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Create token by polling for user authorization
   * @param {string} clientId - OIDC client ID
   * @param {string} clientSecret - OIDC client secret
   * @param {string} deviceCode - Device code
   * @returns {Promise<Object>} Token response
   */
  async createToken(clientId, clientSecret, deviceCode) {
    const requestId = crypto.randomUUID().substring(0, 8);
    logger.info(`[${requestId}] Creating token`);

    const payload = {
      clientId,
      clientSecret,
      deviceCode,
      grantType: 'urn:ietf:params:oauth:grant-type:device_code'
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const options = {
        hostname: 'oidc.us-east-1.amazonaws.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              logger.info(`[${requestId}] Token created successfully`);
              resolve({
                accessToken: data.accessToken,
                tokenType: data.tokenType,
                expiresIn: data.expiresIn,
                refreshToken: data.refreshToken
              });
            } catch (error) {
              logger.error(`[${requestId}] JSON parse error:`, error.message);
              reject(new Error(`JSON parse error: ${error.message}`));
            }
          } else if (res.statusCode === 400) {
            // Handle pending authorization
            try {
              const data = JSON.parse(body);
              if (data.error === 'authorization_pending') {
                reject(new Error('authorization_pending'));
              } else if (data.error === 'slow_down') {
                reject(new Error('slow_down'));
              } else {
                logger.error(`[${requestId}] Token creation failed: ${body}`);
                reject(new Error(`Token creation failed: ${body}`));
              }
            } catch (error) {
              logger.error(`[${requestId}] JSON parse error:`, error.message);
              reject(new Error(`JSON parse error: ${error.message}`));
            }
          } else {
            logger.error(`[${requestId}] Token creation failed: HTTP ${res.statusCode} - ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error(`[${requestId}] Request error:`, error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Refresh token using AWS SSO OIDC
   * @param {string} clientId - OIDC client ID
   * @param {string} clientSecret - OIDC client secret
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} Refreshed token data
   */
  async refreshToken(clientId, clientSecret, refreshToken) {
    const requestId = crypto.randomUUID().substring(0, 8);
    logger.info(`[${requestId}] Refreshing token`);

    const payload = {
      clientId,
      clientSecret,
      refreshToken,
      grantType: 'refresh_token'
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const options = {
        hostname: 'oidc.us-east-1.amazonaws.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              logger.info(`[${requestId}] Token refreshed successfully`);
              resolve({
                accessToken: data.accessToken,
                tokenType: data.tokenType,
                expiresIn: data.expiresIn,
                refreshToken: data.refreshToken
              });
            } catch (error) {
              logger.error(`[${requestId}] JSON parse error:`, error.message);
              reject(new Error(`JSON parse error: ${error.message}`));
            }
          } else {
            logger.error(`[${requestId}] Token refresh failed: HTTP ${res.statusCode} - ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error(`[${requestId}] Request error:`, error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Generate AWS Builder ID login URL
   * @param {string} user_id - User ID
   * @param {number} is_shared - Whether account is shared
   * @param {string} bearer_token - User's bearer token
   * @returns {Promise<Object>} { auth_url, state, expires_in }
   */
  async generateBuilderIDLoginUrl(user_id, is_shared, bearer_token) {
    // Generate machineid
    const machineid = this.generateMachineId();

    // Register OIDC client
    const clientData = await this.registerClient();

    // Start device authorization
    const authData = await this.startDeviceAuthorization(clientData.clientId, clientData.clientSecret);

    // Generate state
    const state = this.generateUUID();

    // Store state in Redis
    const stateData = {
      client_id: clientData.clientId,
      client_secret: clientData.clientSecret,
      device_code: authData.deviceCode,
      machineid,
      user_id,
      is_shared,
      bearer_token,
      timestamp: Date.now(),
      expires_at: Date.now() + (authData.expiresIn * 1000)
    };

    await redisService.set(`${AWS_BUILDER_OAUTH_KEY_PREFIX}${state}`, stateData, authData.expiresIn);

    logger.info(`Generated AWS Builder ID login URL: state=${state}, machineid=${machineid.substring(0, 8)}...`);

    return {
      auth_url: authData.verificationUriComplete,
      user_code: authData.userCode,
      verification_uri: authData.verificationUri,
      state,
      expires_in: authData.expiresIn
    };
  }

  /**
   * Get AWS Builder ID OAuth state info
   * @param {string} state - OAuth state
   * @returns {Promise<Object|null>} State info or null
   */
  async getBuilderIDOAuthStateInfo(state) {
    try {
      const info = await redisService.get(`${AWS_BUILDER_OAUTH_KEY_PREFIX}${state}`);
      return info;
    } catch (error) {
      logger.error('Get AWS Builder ID OAuth state failed:', error.message);
      return null;
    }
  }

  /**
   * Update AWS Builder ID OAuth state
   * @param {string} state - OAuth state
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  async updateBuilderIDOAuthState(state, updates) {
    try {
      const info = await redisService.get(`${AWS_BUILDER_OAUTH_KEY_PREFIX}${state}`);
      if (!info) {
        logger.warn(`AWS Builder ID OAuth state not found: state=${state}`);
        return false;
      }

      const updatedInfo = { ...info, ...updates };
      const ttl = 600; // 10 minutes
      await redisService.set(`${AWS_BUILDER_OAUTH_KEY_PREFIX}${state}`, updatedInfo, ttl);

      logger.info(`AWS Builder ID OAuth state updated: state=${state}`);
      return true;
    } catch (error) {
      logger.error('Update AWS Builder ID OAuth state failed:', error.message);
      return false;
    }
  }

  /**
   * Poll for AWS Builder ID token completion
   * @param {string} state - OAuth state
   * @returns {Promise<Object>} Token data
   */
  async pollForBuilderIDToken(state) {
    const stateInfo = await this.getBuilderIDOAuthStateInfo(state);
    if (!stateInfo) {
      throw new Error('Invalid or expired state');
    }

    const requestId = crypto.randomUUID().substring(0, 8);
    logger.info(`[${requestId}] Polling for AWS Builder ID token: state=${state}`);

    const deadline = new Date(stateInfo.expires_at);
    const interval = 5000; // 5 seconds

    while (new Date() < deadline) {
      try {
        const tokenData = await this.createToken(
          stateInfo.client_id,
          stateInfo.client_secret,
          stateInfo.device_code
        );

        logger.info(`[${requestId}] Token obtained successfully`);

        // Extract email from JWT (simplified - in production you'd decode JWT)
        const email = this.extractEmailFromJWT(tokenData.accessToken);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);

        return {
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
          expires_in: tokenData.expiresIn,
          expires_at: expiresAt.toISOString(),
          auth_method: 'builder-id',
          provider: 'AWS',
          client_id: stateInfo.client_id,
          client_secret: stateInfo.client_secret,
          machineid: stateInfo.machineid,
          email: email || null
        };
      } catch (error) {
        if (error.message === 'authorization_pending') {
          logger.debug(`[${requestId}] Authorization pending, waiting...`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        } else if (error.message === 'slow_down') {
          logger.debug(`[${requestId}] Slow down requested, increasing interval`);
          await new Promise(resolve => setTimeout(resolve, interval * 2));
          continue;
        } else {
          logger.error(`[${requestId}] Token creation failed:`, error.message);
          throw error;
        }
      }
    }

    throw new Error('Authorization timed out');
  }

  /**
   * Simple JWT email extraction (placeholder - in production use proper JWT decoding)
   * @param {string} token - JWT token
   * @returns {string|null} Email or null
   */
  extractEmailFromJWT(token) {
    // This is a simplified version - in production you'd properly decode and verify the JWT
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        return payload.email || null;
      }
    } catch (error) {
      logger.debug('Failed to extract email from JWT:', error.message);
    }
    return null;
  }
}

const kiroAWSBuilderService = new KiroAWSBuilderService();
export default kiroAWSBuilderService;