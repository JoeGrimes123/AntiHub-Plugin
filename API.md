# Antigravity API Service Documentation

## Overview

This is an Antigravity API service that supports multi-user, multi-account management, providing OAuth authentication, account management, quota management, and an OpenAI-compatible chat interface.

Each user has their own API Key (in `sk-xxx` format), authenticated via `Authorization: Bearer sk-xxx`.

## Table of Contents

- [Quick Start](#Quick Start)

- [Database Configuration](#Database Configuration)

- [Authentication Instructions](#Authentication Instructions)

- [API Interface](#api-interface)

- [User Management (Administrator)](#User Management Administrator)

- [OAuth Related](#oauth-related)

- [Account Management](#Account Management)

- [Quota Management](#Quota Management)

- [OpenAI Compatible Interface](#openai-compatible interface)

- [Image Generation Interface](#Image Generation Interface)

---

## Quick Start

### 1. Install Dependencies

```bash npm install

```

### 2. Configure Database

Edit the database configuration in the `config.json` file:

```json

{
"oauth": {

"callbackUrl": "https://your-domain.com/api/oauth/callback"

},
"database": {

"host": "localhost",

"port": 5432,

"database": "antigravity",

"user": "postgres",

"password": "your_password"

},

"security": {

"adminApiKey": "sk-admin-your-secret-key-here"

}
}
```

**Note**: `oauth.callbackUrl` must be configured to a publicly accessible address for Google OAuth callbacks.

### 3. Initialize the Database

Execute the `database/schema.sql` file to create the tables:

```bash
psql -U postgres -d antigravity -f database/schema.sql

```

### 4. Start the Service

```bash
npm start

```
The service will start at `http://0.0.0.0:8045`.

### 5. Creating a User

Create your first user using the administrator API Key:

```bash
curl -X POST http://localhost:8045/api/users \
-H "Authorization: Bearer sk-admin-your-secret-key-here" \
-H "Content-Type: application/json" \

-d '{"name": "Test User"}'

```

The response will return the user's `api_key` (e.g., `sk-x4wIrzp6I8yTe8ARVIYxi9XVke9GNNCEBVi20IqVpuJgISRX`), which the user will use for subsequent operations.

---

## Database Configuration

### Configuration Instructions

Configure PostgreSQL database connection information in `config.json`:

``json

{
"database": {

"host": "localhost",

"port": 5432,

"database": "antigravity",

"user": "postgres",

"password": "your_password",

"max": 20,

"idleTimeoutMillis": 30000,

"connectionTimeoutMillis": 2000

}
}
```

### Data Table Structure

The service uses three main data tables:

1. **users** - Stores user information and API keys

2. **accounts** - Stores user OAuth account information

3. **model_quotas** - Stores model quota information

See detailed table structure [`database/schema.sql`](database/schema.sql:1)

---

## Authentication Instructions

### API Key Types

1. **Administrator API Key**: Configured in `security.adminApiKey` in `config.json`, used for user management and other administrative operations.

2. **User API Key**: Automatically generated when a user is created (`sk-xxx` format), used for daily user operations.

### Authentication Method

All API requests must include the API Key in the request header:

```
Authorization: Bearer sk-xxx

```

Example:

```bash
curl -X GET http://localhost:8045/v1/models \

-H "Authorization: Bearer sk-x4wIrzp6I8yTe8ARVIYxi9XVke9GNNCEBVi20IqVpuJgISRX"

```

---

## API Interface

## User Management (Administrator)

### 1. Create User

**Request**

```http POST /api/users

Authorization: Bearer {Administrator API Key}

Content-Type: application/json

{
"name": "Username"

}
```

**Parameter Description**

- `name` (optional): Username

**Response**

```json

{
"success": true,

"message": "User created successfully",

"data": {

"user_id": "uuid-xxx",

"api_key": "sk-x4wIrzp6I8yTe8ARVIYxi9XVke9GNNCEBVi20IqVpuJgISRX",

"name": "Username",

"created_at": "2025-11-21T14:00:00.000Z" } }

}
```

---

### 2. Get All User List

**Request**

```http GET /api/users

Authorization: Bearer {Administrator API Key}

```

**Response**

```json

{
"success": true,

"data": [

{
"user_id": "uuid-xxx",

"name": "Username",

"status": 1,

"created_at": "2025-11-21T14:00:00.000Z",

"updated_at": "2025-11-21T14:00:00.000Z"

}

]

}
```

---

### 3. Regenerate User API Key

**Request**

```http POST /api/users/{user_id}/regenerate-key

Authorization: Bearer {Administrator API Key}

```

**Response**

```json

{
"success": true,

"message": "API Key has been regenerated",

"data": {

"user_id": "uuid-xxx",

"api_key": "sk-new-key-xxx"

}
}
```

---

### 4. Update User Status

**Request**

```http
PUT /api/users/{user_id}/status

Authorization: Bearer {Administrator API Key}

Content-Type: application/json

{
"status": 0

}
```

**Parameter Description**

- `status` (required): User status, 0=disabled, 1=enabled

**Response**

```json

{
"success": true,

"message": "User status updated to disabled",

"data": {

"user_id": "uuid-xxx",

"status": 0

}
}
```

---

### 5. Delete User

**Request**

```http DELETE /api/users/{user_id}

Authorization: Bearer {Administrator API Key}

```

**Response**

```json

{
"success": true,

"message": "User deleted"

}
```

**Note**: Deleting a user will cascade and delete all accounts and quota records for that user.

---

## OAuth Related

### 1. Obtaining the OAuth Authorization URL

**Request**

```http POST /api/oauth/authorize

Authorization: Bearer {User API Key}

Content-Type: application/json

{
"is_shared": 0

}
```

**Parameter Description**

- `is_shared` (optional): Cookie sharing identifier, 0=exclusive, 1=shared, default is 0

**Note**: The callback URL is configured by the server (`oauth.callbackUrl` in `config.json`), and the user does not need to pass it in.

**Response**

```json

{
"success": true,

"data": {

"auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",

"state": "uuid-state",

"expires_in": 300

}
}
```

**Usage Flow**

1. Call this API to obtain `auth_url`

2. Guide the user to open `auth_url` in their browser for authorization

3. After successful authorization, the user will be redirected to `redirect_uri`, carrying `code` and `state` parameters

---

### 2. OAuth Callback Handling

**Request**

```http GET /api/oauth/callback?code=xxx&state=xxx

```

**Parameter Description**

- `code` (required): OAuth authorization code

- `state` (required): Status identifier (obtained from the authorization URL) (API return)

**Response**

```json

{
"success": true,

"message": "Account added successfully",

"data": {

"cookie_id": "abc123...",

"user_id": "user-123",

"is_shared": 0,

"created_at": "2025-11-21T14:00:00.000Z"

}
}
```

---

## Account Management

### 1. Get the current user's account list

**Request**

```http
GET /api/accounts

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": [
{

"cookie_id": "abc123...","user_id": "user-123",

"is_shared": 0,

"status": 1,

"expires_at": 1732201200000,

"created_at": "2025-11-21T14:00:00.000Z",

"updated_at": "2025-11-21T14:00:00.000Z"

}

]
}
```

---

### 2. Retrieving Single Account Information

**Request**

```http GET /api/accounts/{cookie_id}

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": {

"cookie_id": "abc123...",

"user_id": "user-123", "is_shared": 0,

"status": 1,

"expires_at": 1732201200000,

"created_at": "2025-11-21T14:00:00.000Z",

"updated_at": "2025-11-21T14:00:00.000Z"

}
}
```

---

### 3. Update Account Status

**Request**

```http
PUT /api/accounts/{cookie_id}/status

Authorization: Bearer {User API Key}

Content-Type: application/json

{
"status": 0

}
```

**Parameter Description**

- `status` (required): Account status, 0=disabled, 1=enabled

**Response**

```json

{
"success": true,

"message": "Account status updated to disabled",

"data": {

"cookie_id": "abc123...",

"status": 0

}
}
```

---

### 4. Delete Account

**Request**

```http DELETE /api/accounts/{cookie_id}

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"message": "Account deleted"

}
```

**Note**: Deleting an account will cascade and delete all quota records for that account.

---

## Quota Management

### 1. Retrieve User Shared Quota Pool

**Request**

```http GET /api/quotas/user

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": [

{
"pool_id": 1,

"user_id": "user-123",

"model_name": "gemini-3-pro-high",

"quota": "1.5000",

"max_quota": "2.0000",

"last_recovered_at": "2025-11-21T16:00:00.000Z",

"last_updated_at": "2025-11-21T16:30:00.000Z"

}
]

}
```

**Field Descriptions**

- `quota`: Current quota (deducted when using the shared pool)

- `max_quota`: Quota limit (= 2 * n, where n is the number of shared cookies for the user)

- `last_recovered_at`: Last recovery time

- `last_updated_at`: Last update time

**Quota Mechanism Explanation**

1. **Initial Value**: The shared quota pool is 0 when a user is first created.

2. **Limit**: Quota limit = 2 × number of shared cookies for the user.

3. **Recovery**: Automatically recovers 2n × 0.2 (n is the number of shared cookies for the user) every hour.

4. **Deduction**: Quota is deducted only when using shared cookies.

5. **Purpose**: Exclusive cookies do not affect the quota pool; quota is only required when using the shared pool.

---

### 2. Retrieving Shared Pool Quota

**Request**

```http GET /api/quotas/shared-pool

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": [

{
"model_name": "gemini-3-pro-high",

"total_quota": "2.4500",

"earliest_reset_time": "2025-11-22T01:18:08.000Z",

"available_cookies": 5,

"status": 1,

"last_fetched_at": "2025-11-21T16:45:30.000Z"

}

]
}
```

**Field Description**

- `total_quota`: The total quota of all shared cookies (the sum of the quotas of each cookie)

- `earliest_reset_time`: The earliest quota reset time

- `available_cookies`: Number of shared cookies available

- `status`: Status (1 = available, 0 = unavailable)

- `last_fetched_at`: Time of the last quota fetch

---

### 3. Get Account Quota Information

**Request**

```http GET /api/accounts/{cookie_id}/quotas

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": [
{
"quota_id": 1,

"cookie_id": "abc123...",

"model_name": "gemini-3-pro-high",

"reset_time": "2025-11-21T17:18:08.000Z",

"quota": "0.9800",

"status": 1,

"last_fetched_at": "2025-11-21T14:00:00.000Z",

"created_at": "2025-11-21T14:00:00.000Z"

}

]
}
```

---

### 4. Retrieve User Quota Consumption Records

**Request**

```http GET /api/quotas/consumption?limit=100&start_date=2025-11-01&end_date=2025-11-30

Authorization: Bearer {User API Key}

```

**Parameter Description**

- `limit` (optional): Limit the number of returned values

- `start_date` (optional): Start date (ISO 8601 format)

- `end_date` (optional): End date (ISO 8601 format)

**Response**

```json

{ "success": true,

"data": [
{
"log_id": 1,

"user_id": "user-123",

"cookie_id": "abc123...",

"model_name": "gemini-3-pro-high",

"quota_before": "0.8500",

"quota_after": "0.7200",

"quota_consumed": "0.1300",

"is_shared": 1,

"consumed_at": "2025-11-21T14:00:00.000Z"

}

]
}
```

**Field Descriptions**

- `quota_before`: Cookie quota value before the conversation starts

- `quota_after`: Cookie quota value after the conversation ends

- `quota_consumed`: Quota consumed this time (quota_before - quota_after)

- `is_shared`: Whether to use a shared cookie (1=shared, 0=exclusive)

**Note**

- Only consumption using a shared cookie (is_shared=1) will be deducted from the user's shared quota pool.

- Consumption using an exclusive cookie (is_shared=0) is only recorded and not deducted from the quota pool.

---

### 5. Get User Model Consumption Statistics

**Request**

```http GET /api/quotas/consumption/stats/{model_name}

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"success": true,

"data": {

"total_requests": "150",

"total_quota_consumed": "19.5000",

"avg_quota_consumed": "0.1300",

"last_used_at": "2025-11-21T14:00:00.000Z"

}
}
```

**Field Descriptions**

- `total_requests`: Total number of requests

- `total_quota_consumed`: Total quota consumed

- `avg_quota_consumed`: Average quota consumed per request

- `last_used_at`: Last used time

---

### 6. Retrieving Models with Approaching Quota Exhaustion (Administrators)

**Requests**

```http GET /api/quotas/low?threshold=0.1

Authorization: Bearer {Administrator API Key}

```

**Parameter Descriptions**

- `threshold` (optional): Quota threshold, defaults to 0.1 (i.e., 10%)

**Response**

```json

{
"success": true,

"data": [
{ "quota_id": 2,

"cookie_id": "abc123...",

"model_name": "claude-sonnet-4-5",

"reset_time": "2025-11-21T17:16:32.000Z",

"quota": "0.0500",

"status": 1,

"user_id": "user-123",

"is_shared": 0

}

]
}
```

---

## OpenAI Compatible Interface

### 1. Get Model List

**Request**

```http
GET /v1/models

Authorization: Bearer {User API Key}

```

**Response**

```json

{
"object": "list",

"data": [

{
"id": "gemini-3-pro-high",

"object": "model",

"created": 1732201200,

"owned_by": "google"

},

{
"id": "claude-sonnet-4-5",

"object": "model",

"created": 1732201200,

"owned_by": "google"

}

]
}
```

### 3. Image Generation

**Request**

```http
POST /v1beta/models/{model}:generateContent

Authorization: Bearer {User API Key}

Content-Type: application/json

{
"contents": [
{
"role": "user",

"parts": [
{
"text": "Generate a cute cat"

}

]

}

],

"generationConfig": {

"imageConfig": {

"aspectRatio": "1:1", "imageSize": "1K"

}
}
}
```

**Parameter Description**

- `model` (required): Model name, e.g., `gemini-2.5-flash-image` or `gemini-2.5-pro-image`

- `contents` (required): Array of messages containing prompts

- `generationConfig.imageConfig` (optional): Image generation configuration

- `aspectRatio`: Aspect ratio. Supported aspect ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`. If not specified, the model will choose the default aspect ratio based on any provided reference image.

- `imageSize`: Image size. Supported values ​​are `1K`, `2K`, `4K`. If not specified, the model will use the default value `1K`.

**Response**

```json

{ "candidates": [
{
"content": {
"parts": [
{
"inlineData": {
"mimeType": "image/jpeg",
"data": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDA..."

}
}
],
"role": "model"

},
"finishReason": "STOP"

}
]
}
```

**Field Description**

- `candidates[0].content.parts[0].inlineData.data`: Base64 encoded image data

- `candidates[0].content.parts[0].inlineData.mimeType`: Image MIME type, e.g., `image/jpeg`

---

### 2. Chat Completion

**Request (Streaming)**

```http POST /v1/chat/completions
Authorization: Bearer {User API Key}

Content-Type: application/json

{
"model": "gemini-3-pro-high",

"messages": [

{
"role": "user",

"content": "你好"

}

],

"stream": true,

"temperature": 1.0,

"max_tokens": 8096

}
```

**Request (Non-streaming)**

```http POST /v1/chat/completions

Authorization: Bearer {User API Key}

Content-Type: application/json

{
"model": "gemini-3-pro-high",

"messages": [

{
"role": "user",

"content": "你好"

}

],

"stream": false

}
```

**Parameter Description**

- `model` (required): Model name

- `messages` (required): Array of messages

- `stream` (optional): Whether to use streaming output, defaults to true

- `temperature` (optional): Temperature parameter, defaults to 1.0

- `max_tokens` (optional): Maximum number of output tokens

- `tools` (optional): Tool call configuration

**Response (Streaming)**

```
data: {"id":"chatcmpl-1732201200","object":"chat.completion.chunk","created":1732201200,"model":"gemini-3-pro-high","choices":[{"index":0,"delta":{"content":"you"},"finish_reason":null}]}

data: {"id":"chatcmpl-1732201200","object":"chat.completion.chunk","created":1732201200,"model":"gemini-3-pro-high","choices":[{"index":0,"delta":{"content":"Good"},"finish_reason":null}]}

data: {"id":"chatcmpl-1732201200","object":"chat.completion.chunk","created":1732201200,"model":"gemini-3-pro-high","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Response (non-streaming)**

```json
{ 
"id": "chatcmpl-1732201200", "object": "chat.completion",

"created": 1732201200,

"model": "gemini-3-pro-high",

"choices": [

{
"index": 0,

"message": {

"role": "assistant",

"content": "Hello! How can I help you?" "

},

"finish_reason": "stop"

}

]

}
``

---

## Workflow

### Account Addition Process

1. The administrator creates a user using `POST /api/users` and obtains the user's `api_key`.

2. The user uses their own `api_key` to call `POST /api/oauth/authorize` to obtain the OAuth URL.

3. The user opens the OAuth URL in their browser to authorize.

4. After successful authorization, `GET /api/oauth/callback` is automatically called back.

5. The system automatically saves the account information to the database.

### Chat Request Process

1. The user sends a chat request to `POST /v1/chat/completions` using their own `api_key`.

2. The system searches for available accounts based on the user ID and model (preferably using exclusive accounts).

3. It checks if the account's quota for the model is available.

4. If the token has expired, it automatically refreshes the token.

5. The system uses the account's token to call... Antigravity API

6. Automatically update quota information after a conversation ends

### Quota Management Process

#### Cookie Quota Update

1. After each conversation ends, the system automatically calls the `fetchAvailableModels` API.

2. Update the cookie quota information (`remainingFraction` and `resetTime`) in the database.

3. If a model's `remainingFraction` is 0, set the model's `status` to 0.

4. The next time the model is requested, accounts with a quota of 0 will be skipped.

#### User Shared Quota Pool

1. **Initialization**: When a user is created, the shared quota pool is initially set to 0.

2. **Maximum Limit Setting**: When a user adds a shared cookie, the quota pool limit is automatically updated to 2 × n (n is the number of shared cookies).

3. **Quota Consumption**:

- When using shared cookies in a conversation, record `quota_before` and `quota_after`.

- Calculate consumption: `quota_consumed = ...` quota_before - quota_after

- Deducts consumption from the user's shared quota pool

4. **Quota Recovery**:

- Automatically executes a recovery task (scheduled task) every hour

- Recovery amount = 2n × 0.2 (n is the number of valid shared cookies for the user)

- After recovery, the quota limit (2n) will not be exceeded

5. **Note**: The use of dedicated cookies does not affect the shared quota pool; it is only for recording purposes

#### Quota Recovery Scheduled Task

```bash

# Manually execute the recovery task

node scripts/quota-recovery-cron.js

# Add to crontab (executes once per hour)

0 * * * * /usr/bin/node /path/to/scripts/quota-recovery-cron.js

```

---

## Error Handling

### Common Error Codes

- `400 Bad Request`: Incorrect request parameters

- `401 Unauthorized`: API Key verification failed or authentication information is missing

- 403 Forbidden: Insufficient permissions

- 404 Not Found: Resource does not exist

- 500 Internal Server Error: Internal server error

### Error Response Format

```json

{
"error": "Error message"

}
```

---

## Best Practices

### 1. API Key Management

- Each user uses a unique API Key

- Administrator API Keys are only for user management and should not be distributed to ordinary users

- If an API Key is leaked, regenerate it using `POST /api/users/{user_id}/regenerate-key`

### 2. Account Management

- It is recommended to create a dedicated account for each user (`is_shared=0`)

- Shared accounts (`is_shared=1`) are only for backup

- Regularly check quota usage and add new accounts promptly

### 3. Quota Monitoring

- Administrators use `GET /api/quotas/low` Monitor models with low API quotas

- Add a new account or switch models before the quota is exhausted

### 4. Error Retry

- If a request fails, it can be retried (the system will automatically switch to the next available account).

- It is recommended to implement an exponential backoff retry strategy.

---
## License

MIT License