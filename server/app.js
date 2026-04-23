/**
 * 碰头小程序后端服务 — Express (behind Nginx)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件：头像上传目录（两个路径都挂载，确保可访问）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'meetpoint-server', time: new Date().toISOString() });
});

app.use('/api', routes);

const PORT = 3000;
connectDB().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log('[Server] running on port ' + PORT);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
