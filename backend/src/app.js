require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { generalLimiter } = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'chrome-extension://*'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /^chrome-extension:\/\/.*/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Extension-Token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.set('io', io);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const startServer = async () => {
  await connectDB();
  await connectRedis();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`?? Server running on http://localhost:${PORT}`);
  });
};

startServer();

module.exports = { app, io };
