#!/bin/bash
# 碰头小程序后端 — 一键部署脚本
set -e

echo "===== 1. 安装 Node.js 20.x ====="
if ! command -v node &>/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  yum install -y nodejs
fi
node -v
npm -v

echo "===== 2. 安装 MongoDB 7.0 ====="
if ! command -v mongod &>/dev/null; then
  cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
  yum install -y mongodb-org
fi
systemctl start mongod || mongod --fork --logpath /var/log/mongod.log --dbpath /var/lib/mongo
systemctl enable mongod 2>/dev/null || true
echo "MongoDB started"

echo "===== 3. 安装 PM2 ====="
npm install -g pm2 2>/dev/null || true

echo "===== 4. 部署应用 ====="
mkdir -p /opt/meetpoint
cd /opt/meetpoint

# 写入 package.json
cat > package.json << 'PKGJSON'
{
  "name": "meetpoint-server",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": { "start": "node app.js" },
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
PKGJSON

# 写入 .env
cat > .env << 'ENVFILE'
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/meetpoint
ENVFILE

echo "===== 5. 安装依赖 ====="
npm install --production

echo "===== 6. 启动服务 ====="
pm2 stop meetpoint 2>/dev/null || true
pm2 delete meetpoint 2>/dev/null || true
pm2 start app.js --name meetpoint
pm2 save
pm2 startup 2>/dev/null || true

echo "===== 7. 开放端口 ====="
firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo ""
echo "===== 部署完成 ====="
pm2 status
echo ""
echo "API 地址: http://$(hostname -I | awk '{print $1}'):3000"
echo "测试: curl http://localhost:3000/"
