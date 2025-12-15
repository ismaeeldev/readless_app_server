import express from 'express';
import { chat } from '../controllers/chatController.js';
import { summarizePdf, summarizeBatchPdfs } from '../controllers/summaryController.js';
import { checkHealth } from '../controllers/healthController.js';

const router = express.Router();

// Chat Endpoint
router.post('/chat', chat);

// Summary Endpoints
router.post('/summary/single', summarizePdf);
router.post('/summary/batch', summarizeBatchPdfs);

// Health Check Endpoint
router.post('/health', checkHealth);

export default router;
