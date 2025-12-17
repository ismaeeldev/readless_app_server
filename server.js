import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import workflowRoutes from './routes/workflowRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', workflowRoutes);

// Base Route
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ReadLess AI – Server Status</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', Arial, sans-serif;
        }

        body {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
          color: #ffffff;
        }

        .card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          padding: 40px 50px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 420px;
          width: 90%;
        }

        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(0, 255, 150, 0.15);
          color: #00ff96;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        h1 {
          font-size: 28px;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }

        p {
          font-size: 15px;
          opacity: 0.85;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .footer {
          font-size: 12px;
          opacity: 0.6;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● Server Online</div>
        <h1>ReadLess AI</h1>
        <p>
          Backend services are up and running smoothly.<br />
          APIs, AI workflows, and pipelines are operational.
        </p>
        <div class="footer">
          © ${new Date().getFullYear()} ReadLess AI · All systems normal
        </div>
      </div>
    </body>
    </html>
  `);
});


// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err.stack);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message
    });
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

server.on('error', (e) => {
    console.error('SERVER ERROR:', e);
});

// DEBUG: Keep process alive to see if it's an event loop issue
setInterval(() => {
    // console.log('Heartbeat...'); // Commented out to reduce noise, but keeps loop alive
}, 10000);

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
