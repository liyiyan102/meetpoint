/**
 * MongoDB 数据库连接模块
 */
const { MongoClient } = require('mongodb');

let _db = null;
let _client = null;

async function connectDB() {
  if (_db) return _db;
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meetpoint';
  _client = new MongoClient(uri);
  await _client.connect();
  _db = _client.db();
  console.log('[DB] MongoDB connected:', uri);
  return _db;
}

function getDB() {
  if (!_db) throw new Error('Database not connected. Call connectDB() first.');
  return _db;
}

module.exports = { connectDB, getDB };
