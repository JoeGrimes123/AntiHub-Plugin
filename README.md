Authentication Failed: Invalid Token # Antigravity to OpenAI API Proxy Service

A powerful proxy service for converting the Antigravity API to an OpenAI-compatible format, supporting multi-user management, OAuth authentication, quota management, streaming responses, tool calls, and multi-account rotation.

## 📝 Declaration

This project is developed and extended based on [liuw1535](https://github.com/liuw1535)'s [antigravity2api-nodejs](https://github.com/liuw1535/antigravity2api-nodejs). Thanks to the original author for their open-source contribution!

## ✨ Features

- 🔄 **OpenAI API Compatible Formats** - Fully compatible with OpenAI API v1 interface

- 🌊 **Streaming and Non-Streaming Responses** - Supports SSE streaming output and traditional responses

- 🛠️ **Tool Call Support** - Full support for Function Calling

- 👥 **Multi-User Management** - Supports multi-user isolation, each user has an independent API Key

- 🔄 **Automatic Account Rotation** - Intelligent account switching improves service availability

- 🔐 **OAuth Authentication** - Secure authentication based on Google OAuth

- 🔄 **Automatic Token Refresh** - Automatically handles token expiration and refresh

- 📊 **Quota Management System** - Precise quota monitoring and automatic recovery mechanism

- 🖼️ **Image Input Support** - Supports Base64 encoded multimodal input

- 🧠 **Mind Chain Output** - Supports AI Thought Process Output

- 📈 **Usage Statistics** - Detailed quota consumption and usage records

## 🚀 Quick Start

### Environment Requirements

- Node.js >= 18.0.0

- PostgreSQL >= 12

### 1. Install Dependencies

```bash
npm install

```

### 2. Configure Database

Copy the configuration file template and replace it with your own actual data:

```bash
cp config.json.example config.json

```

### 3. Initialize Database

Create the database and table structure:

```bash
# Create database
createdb antigv

# Import table structure
psql -U postgres -d antigv -f schema.sql

```

### 4. Start Service

```bash
npm start
```
The service will be available in... Start `http://0.0.0.0:8045`.

### 5. Create the First User

Create a user using the administrator API Key:

```bash
curl -X POST http://localhost:8045/api/users \
-H "Authorization: Bearer sk-admin-your-secret-key-here" \
-H "Content-Type: application/json" \

-d '{"name": "Test User"}'

```

The response will return the user's API Key for subsequent operations.

## 📖 API Usage

### Retrieving Model List

```bash
curl http://localhost:8045/v1/models \
-H "Authorization: Bearer sk-user-api-key"

```

### Chat Completion (Streaming)

```bash
curl http://localhost:8045/v1/chat/completions \

-H "Content-Type: application/json" \

-H "Authorization: Bearer sk-user-api-key" \

-d '{

"model": "gemini-3-pro-high",

"messages": [{"role": "user", "content": "你好"}],

"stream": true

}'
```

### Chat Completion (Non-Streaming)

```bash
curl http://localhost:8045/v1/chat/completions \

-H "Content-Type: application/json" \
-H "Authorization: Bearer sk-user-api-key" \
-d '{
"model": "gemini-3-pro-high",

"messages": [{"role": "user", "content": "你好"}],

"stream": false

}'
```

### Tool Call Example

```bash
curl http://localhost:8045/v1/chat/completions \

-H "Content-Type: application/json" \

-H "Authorization: Bearer sk-user-api-key" \

-d '{

"model": "gemini-3-pro-high",

"messages": [{"role": "user", "content": "北京天气如何"}],

"tools": [{

"type": "function",

"function": {

"name": "get_weather",

"description": "Get Weather Information",

"parameters": {

"type": "object",

"properties": {

"location": {"type": "string", "description": "City Name"}

}
}
}
}
}]

}'
```

### Image Input Example

Supports Base64 encoded image input:

```bash
curl http://localhost:8045/v1/chat/completions \

-H "Content-Type: application/json" \

-H "Authorization: Bearer sk-user-api-key" \

-d '{

"model": "gemini-3-pro-high",

"messages": [{

"role": "user",

"content": [

{"type": "text", "text": "What's in this image?"},

{
"type": "image_url",

"image_url": {

"url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."

}
}
]
}],

"stream": true

}'
```

Supported image formats:

- JPEG/JPG (`data:image/jpeg;base64,...`)

- PNG (`data:image/png;base64,...`)

- GIF (`data:image/gif;base64,...`)

- WebP (`data:image/webp;base64,...`)

## 🔐 Account Management

### Add a Google Account

1. Obtain the OAuth authorization URL:

```bash
curl -X POST http://localhost:8045/api/oauth/authorize \

-H "Authorization: Bearer sk-user-api-key" \

-H "Content-Type: application/json" \
-d '{"is_shared": 0}'

```

2. Open the returned `auth_url` in your browser to authorize.

3. After successful authorization, the account information will be automatically saved via callback.

### View Account List

```bash
curl http://localhost:8045/api/accounts \

-H "Authorization: Bearer sk-user-api-key"

```

## 📊 Quota Management

### View User Quota

```bash
curl http://localhost:8045/api/quotas/user \

-H "Authorization: Bearer sk-user-api-key"

```

### View Quota Consumption Records

```bash
curl "http://localhost:8045/api/quotas/consumption?limit=100" \

-H "Authorization: Bearer sk-user-api-key"

```

### Quota Mechanism Explanation

- **Dedicated Account** (`is_shared=0`): Does not consume the quota pool, only records information.

- **Shared Account** (`is_shared=1`): Consumes the user's shared quota pool.

- **Quota Limit**: 2 × Number of user shared accounts

- **Auto-Recovery**: Recovers 2n × 0.2 per hour (n is the number of shared accounts)

## ⚙️ Configuration Instructions

### Complete Configuration of config.json

```json

{
"server": {

"port": 8045,

"host": "0.0.0.0"

},

"oauth": {

"callbackUrl": "https://your-domain.com/api/oauth/callback"

},

"database": {

"host": "localhost",

"port": 5432,

"database": "anti-gravity", 
"user": "postgres", 
"password": "your_password", 
"max": 20, 
"idleTimeoutMillis": 30000, 
"connectionTimeoutMillis": 2000 
}, 
"api": { 
"url": "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:streamGenerateContent?alt=sse", 
"modelsUrl": "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels", 
"host": "daily-cloudcode-pa.sandbox.googleapis.com", 
"userAgent": "antigravity/1.11.3 windows/amd64" 
}, 
"defaults": { 
"temperature": 1, 
"top_p": 0.85, 
"top_k": 50, 
"max_tokens": 8096 
}, 
"security": { 
"maxRequestSize": "50mb", 
"adminApiKey": "sk-admin-your-secret-key-here"},

"systemInstruction": ""

}
```

| Configuration Item | Description | Default Value |

|--------|------|--------|

| `server.port` | Service Port | 8045 |

| `server.host` | Listening Address | 0.0.0.0 |

| `oauth.callbackUrl` | OAuth Callback Address | - |

| `database.*` | Database Connection Configuration | - |

| `security.adminApiKey` | Administrator API Key | - |

| `security.maxRequestSize` | Maximum Request Body Size | 50mb |

| `defaults.temperature` | Default Temperature Parameter | 1 |

| `defaults.top_p` | Default Top_p | 0.85 |

| `defaults.top_k` | Default Top_k | 50 |

| `defaults.max_tokens` | Default Maximum Token Count | 8096 |

## 🛠️ Development Commands

```bash

# Start the service

npm start

# Development mode (automatic restart)

npm run dev

# Manually execute quota recovery task

node scripts/quota-recovery-cron.js

```

## 📁 Project Structure

```

.
├── data/ # Data storage directory (automatically generated)

│ └── accounts.json # Token storage (old version)

├── scripts/ # Script directory

│ ├── oauth-server.js # OAuth login service

│ └── quota-recovery-cron.js # Quota recovery scheduled task

├── src/ # Source code directory

│ ├── api/ # API call logic

│ │ ├── client.js # Single account client

│ │ └── multi_account_client.js # Multi-Account Client

│ ├── auth/ # Authentication Module

│ │ └── token_manager.js # Token Management

│ ├── config/ # Configuration Module

│ │ └── config.js # Configuration Loading

│ ├── db/ # Database Module

│ │ └── database.js # Database Connection

│ ├── server/ # Server Module

│ │ ├── index.js # Main Server

│ │ └── routes.js # Route Definition

│ ├── services/ # Business Services

│ │ ├── account.service.js # Account Service

│ │ ├── oauth.service.js # OAuth Service

│ │ ├── quota.service.js # Quota Service

│ │ └── user.service.js # User Service

│ └── utils/ # Utility Modules

│ ├── logger.js # Logger module

│ └── utils.js # Utility functions

├── test/ # Test directory

│ ├── debug-request.js # Debug script

│ └── test-transform.js # Test script

├── config.json # Configuration file

├── config.json.example # Configuration file template

├── package.json # Project configuration

├── API.md # Detailed API documentation

└── README.md # Project description

```

## 🔧 Workflow

### User and Account Management Workflow

1. **Administrator Creates User** - Creates a user using the administrator's API Key and obtains the user's API Key

2. **User Adds Account** - Users add Google accounts using their own API Key via OAuth

3. **Automatic Account Management** - The system automatically handles token refresh and account rotation

4. **Quota Monitoring** - Real-time monitoring of quota usage, automatic recovery, and alerts

### Chat Request Processing Flow

1. **Authentication Verification** - Verify user API Key

2. **Account Selection** - Select available accounts based on user and model (dedicated accounts preferred)

3. **Quota Check** - Check if account quota is sufficient

4. **Token Management** - Automatically refresh expired tokens

5. **API Call** - Call the Anti-Gravity API

6. **Response Conversion** - Convert to OpenAI compatible format

7. **Quota Update** - Update quota usage records

## ⚠️ Precautions

1. **Security Configuration**

- `config.json` contains sensitive information; do not disclose it.

- The administrator API Key is only used for management operations.

- Please use strong passwords and HTTPS in the production environment.

2. **Quota Management**

- Shared accounts consume quota pool resources, dedicated accounts do not.

- Quotas are automatically restored every hour.

- It is recommended to monitor quota usage regularly.

3. **Account Maintenance**

- Token Automatic refresh, no manual maintenance required

- Accounts that fail to refresh will be automatically disabled

- It is recommended to configure multiple backup accounts for each user

4. **Performance Optimization**

- Supports concurrent requests from multiple accounts

- Automatic load balancing and failover

- It is recommended to adjust the database connection pool size according to usage

## 📄 License

MIT License

## 🤝 Contributions

We welcome Issues and Pull Requests to improve this project.

## 📞 Support

If you encounter any problems, please see [API.md](API.md) for detailed API documentation, or submit an Issue for help.