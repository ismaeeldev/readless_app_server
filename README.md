# ReadCheck AI Workflow Server

A robust Express.js backend for AI-powered PDF analysis workflows.

## Features
- **PDF Chat**: Ask questions about a PDF using RAG (Retrieval-Augmented Generation).
- **PDF Summary**: Generate summaries (standard or custom types) for single or multiple PDFs.
- **Health Check**: Analyze the "health" (quality, clarity) of a PDF document.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configuration**
   Ensure your `.env` file is set up with necessary API keys (OpenAI, Pinecone, Google, etc.) and `BASE_URL`.
   ```env
   BASE_URL=http://localhost:3000
   PORT=3000
   ```

3. **Run Server**
   ```bash
   npm start
   # or
   node server.js
   ```

## API Documentation

### 1. Chat with PDF
**Endpoint**: `POST /api/chat`

**Body**:
```json
{
  "pdfUrl": "https://example.com/file.pdf",
  "query": "What is the main conclusion?",
  "sessionId": "optional-session-id"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "question": "...",
    "answer": "...",
    "contextChunks": [...]
  }
}
```

### 2. Single PDF Summary
**Endpoint**: `POST /api/summary/single`

**Body**:
```json
{
  "pdfUrl": "https://example.com/file.pdf",
  "summaryType": "Detailed Analysis" // Optional. Default: "Standard Summary"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "summary": "..." }
}
```

### 3. Batch PDF Summary
**Endpoint**: `POST /api/summary/batch`

**Body**:
```json
{
  "pdfUrls": [
    "https://example.com/file1.pdf",
    "https://example.com/file2.pdf"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": { "combinedSummary": "..." }
}
```

### 4. PDF Health Check
**Endpoint**: `POST /api/health`

**Body**:
```json
{
  "pdfUrl": "https://example.com/file.pdf"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": 85,
    "readability": 90,
    "structure": 80,
    "clarity": 85,
    "recommendation": ["Improve heading hierarchy"]
  }
}
```

## Changing Base URL
To update the `BASE_URL` (e.g. after deployment):
1. Open `.env` file.
2. Change valid of `BASE_URL`.
   ```env
   BASE_URL=https://your-deployed-domain.com
   ```
3. Restart the server.
