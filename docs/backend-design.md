# 碰面小程序 — 后台与数据库设计方案

## 一、架构概览

```
┌─────────────────────────────────────────────────┐
│              微信小程序前端                        │
│  首页 / 加入页 / 地图页                           │
└──────────┬──────────────────────┬────────────────┘
           │ HTTPS                │ WebSocket
           ▼                      ▼
┌─────────────────────────────────────────────────┐
│               云开发 / 后端服务                    │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 用户模块  │  │ 碰头模块  │  │ 实时位置模块   │  │
│  │ (REST)   │  │ (REST)   │  │ (WebSocket)   │  │
│  └──────┬───┘  └──────┬───┘  └───────┬───────┘  │
│         │             │              │            │
│         ▼             ▼              ▼            │
│  ┌──────────────────────────────────────────┐    │
│  │           数据库层                        │    │
│  │  MySQL/PostgreSQL + Redis                │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │      腾讯地图 API (路线规划/POI)          │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**推荐技术栈**：微信云开发（CloudBase）— 免运维，自带数据库、云函数、实时推送能力，与小程序天然集成。

---

## 二、数据库表设计

### 2.1 用户表 `users`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(64) PK | 用户唯一 ID（微信 openid） |
| `union_id` | VARCHAR(64) | 微信 unionId（可选） |
| `nickname` | VARCHAR(50) | 昵称 |
| `avatar_url` | VARCHAR(512) | 头像 URL |
| `phone` | VARCHAR(20) | 手机号（可选，授权后获取） |
| `created_at` | DATETIME | 注册时间 |
| `updated_at` | DATETIME | 最后更新时间 |
| `last_active_at` | DATETIME | 最后活跃时间 |

```sql
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  union_id VARCHAR(64) DEFAULT NULL,
  nickname VARCHAR(50) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) DEFAULT '',
  phone VARCHAR(20) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT NULL,
  INDEX idx_union_id (union_id)
);
```

### 2.2 碰头活动表 `meetings`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(6) PK | 6 位碰头码（如 `A3KP7N`） |
| `creator_id` | VARCHAR(64) FK | 发起人用户 ID |
| `status` | TINYINT | 状态：1=进行中 2=已结束 3=已过期 |
| `meet_point_id` | VARCHAR(64) | 碰头地点 ID（关联 meet_points 表） |
| `max_members` | INT | 最大成员数，默认 20 |
| `created_at` | DATETIME | 创建时间 |
| `ended_at` | DATETIME | 结束时间 |
| `expire_at` | DATETIME | 过期时间（创建后 24 小时自动过期） |

```sql
CREATE TABLE meetings (
  id VARCHAR(6) PRIMARY KEY,
  creator_id VARCHAR(64) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=进行中 2=已结束 3=已过期',
  meet_point_id VARCHAR(64) DEFAULT NULL,
  max_members INT NOT NULL DEFAULT 20,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME DEFAULT NULL,
  expire_at DATETIME NOT NULL,
  INDEX idx_creator (creator_id),
  INDEX idx_status (status),
  INDEX idx_expire (expire_at),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

### 2.3 碰头成员表 `meeting_members`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK AUTO | 自增主键 |
| `meeting_id` | VARCHAR(6) FK | 碰头活动 ID |
| `user_id` | VARCHAR(64) FK | 用户 ID |
| `role` | TINYINT | 1=发起人 2=成员 |
| `latitude` | DECIMAL(10,7) | 最新纬度 |
| `longitude` | DECIMAL(10,7) | 最新经度 |
| `last_location_at` | DATETIME | 最后定位时间 |
| `is_online` | TINYINT | 是否在线（30 秒内有位置更新） |
| `joined_at` | DATETIME | 加入时间 |
| `left_at` | DATETIME | 退出时间（NULL=未退出） |

```sql
CREATE TABLE meeting_members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  meeting_id VARCHAR(6) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role TINYINT NOT NULL DEFAULT 2 COMMENT '1=发起人 2=成员',
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  last_location_at DATETIME DEFAULT NULL,
  is_online TINYINT NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME DEFAULT NULL,
  UNIQUE INDEX uk_meeting_user (meeting_id, user_id),
  INDEX idx_meeting (meeting_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2.4 手动好友位置表 `manual_friends`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(64) PK | 手动好友 ID |
| `meeting_id` | VARCHAR(6) FK | 所属碰头 |
| `name` | VARCHAR(50) | 好友名称 |
| `latitude` | DECIMAL(10,7) | 纬度 |
| `longitude` | DECIMAL(10,7) | 经度 |
| `address` | VARCHAR(200) | 地址描述 |
| `added_by` | VARCHAR(64) FK | 添加者用户 ID |
| `created_at` | DATETIME | 添加时间 |

```sql
CREATE TABLE manual_friends (
  id VARCHAR(64) PRIMARY KEY,
  meeting_id VARCHAR(6) NOT NULL,
  name VARCHAR(50) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  address VARCHAR(200) DEFAULT '',
  added_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meeting (meeting_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);
```

### 2.5 碰头地点表 `meet_points`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(64) PK | 地点 ID（腾讯地图 POI ID 或自生成） |
| `meeting_id` | VARCHAR(6) FK | 所属碰头 |
| `name` | VARCHAR(100) | 地点名称 |
| `type` | VARCHAR(50) | 地点类型（美食/公园/咖啡店等） |
| `address` | VARCHAR(200) | 详细地址 |
| `tel` | VARCHAR(30) | 联系电话 |
| `rating` | VARCHAR(10) | 评分 |
| `latitude` | DECIMAL(10,7) | 纬度 |
| `longitude` | DECIMAL(10,7) | 经度 |
| `set_by` | VARCHAR(64) FK | 设置者用户 ID |
| `created_at` | DATETIME | 设置时间 |

```sql
CREATE TABLE meet_points (
  id VARCHAR(64) PRIMARY KEY,
  meeting_id VARCHAR(6) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT '',
  address VARCHAR(200) DEFAULT '',
  tel VARCHAR(30) DEFAULT '',
  rating VARCHAR(10) DEFAULT '',
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  set_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meeting (meeting_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

---

## 三、后端 API 接口设计

### 3.1 用户模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/login` | 微信登录（code → openid → 创建/更新用户） |
| PUT | `/api/user/profile` | 更新昵称、头像 |
| GET | `/api/user/me` | 获取当前用户信息 |

#### POST `/api/user/login`
```json
// 请求
{ "code": "微信登录code" }

// 响应
{
  "userId": "openid_xxx",
  "nickname": "小明",
  "avatarUrl": "https://...",
  "token": "jwt_token_xxx",
  "isNew": true
}
```

### 3.2 碰头模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/meeting/create` | 发起碰头 |
| POST | `/api/meeting/join` | 加入碰头 |
| GET | `/api/meeting/:id` | 获取碰头详情（含成员、地点） |
| PUT | `/api/meeting/:id/end` | 结束碰头 |
| DELETE | `/api/meeting/:id/leave` | 退出碰头 |

#### POST `/api/meeting/create`
```json
// 请求（Header: Authorization: Bearer token）
{}

// 响应
{
  "meetingId": "A3KP7N",
  "expireAt": "2026-04-16T16:43:00Z"
}
```

#### GET `/api/meeting/:id`
```json
// 响应
{
  "id": "A3KP7N",
  "status": 1,
  "creator": { "userId": "xxx", "nickname": "小明" },
  "members": [
    {
      "userId": "xxx",
      "nickname": "小明",
      "avatarUrl": "...",
      "latitude": 39.9042,
      "longitude": 116.4074,
      "isOnline": true,
      "role": 1
    }
  ],
  "manualFriends": [
    {
      "id": "mf_xxx",
      "name": "小红",
      "latitude": 39.91,
      "longitude": 116.42,
      "address": "朝阳区xxx"
    }
  ],
  "meetPoint": {
    "id": "poi_xxx",
    "name": "星巴克(国贸店)",
    "latitude": 39.908,
    "longitude": 116.413
  },
  "expireAt": "2026-04-16T16:43:00Z"
}
```

### 3.3 位置模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/meeting/:id/location` | 上报位置（HTTP 轮询方案） |
| WS | `/ws/meeting/:id` | 实时位置推送（WebSocket 方案） |

#### POST `/api/meeting/:id/location`
```json
// 请求
{ "latitude": 39.9042, "longitude": 116.4074 }

// 响应 — 返回所有成员最新位置（减少请求数）
{
  "members": [...],
  "manualFriends": [...],
  "meetPoint": {...}
}
```

### 3.4 好友管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/meeting/:id/friend` | 添加手动好友位置 |
| DELETE | `/api/meeting/:id/friend/:fid` | 删除手动好友 |

### 3.5 碰头地点

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/meeting/:id/meetpoint` | 设置碰头地点 |
| DELETE | `/api/meeting/:id/meetpoint` | 取消碰头地点 |

---

## 四、实时位置同步方案

### 方案 A：轮询（简单，推荐起步阶段）

```
前端每 5 秒调用 POST /api/meeting/:id/location
↓
服务端更新当前用户位置
↓
返回所有成员最新位置
↓
前端刷新地图 markers
```

**优点**：实现简单，兼容性好
**缺点**：有 5 秒延迟，请求量较大

### 方案 B：WebSocket（推荐正式版本）

```
前端连接 ws://server/ws/meeting/:id?token=xxx
↓
前端每 5 秒发送: { type: "location", lat: 39.9, lng: 116.4 }
↓
服务端广播给同碰头所有在线成员:
{
  type: "location_update",
  userId: "xxx",
  latitude: 39.9,
  longitude: 116.4,
  timestamp: 1713189000
}
↓
其他成员收到后实时更新地图 marker
```

**额外推送事件**：
- `member_join` — 新成员加入
- `member_leave` — 成员退出
- `meetpoint_set` — 碰头地点设置/变更
- `meetpoint_removed` — 碰头地点取消
- `friend_added` — 手动好友添加
- `friend_removed` — 手动好友删除
- `meeting_ended` — 碰头结束

### 方案 C：微信云开发实时推送（最推荐）

使用云开发的 **实时数据库监听**（`watch`），无需自建 WebSocket：

```javascript
// 前端监听碰头数据变化
const db = wx.cloud.database();
const watcher = db.collection('meetings')
  .doc(meetingId)
  .watch({
    onChange(snapshot) {
      // 数据变化时自动触发，刷新地图
      const meeting = snapshot.docs[0];
      refreshMarkers(meeting);
    },
    onError(err) {
      console.error('监听失败', err);
    }
  });
```

---

## 五、云开发数据库设计（NoSQL 版本）

如果使用微信云开发（推荐），数据库为 MongoDB 风格的文档数据库，设计如下：

### 集合 `users`
```json
{
  "_id": "openid_xxx",
  "nickname": "小明",
  "avatarUrl": "https://...",
  "phone": "",
  "createdAt": "2026-04-15T16:00:00Z",
  "lastActiveAt": "2026-04-15T16:43:00Z"
}
```

### 集合 `meetings`
```json
{
  "_id": "A3KP7N",
  "creatorId": "openid_xxx",
  "status": 1,
  "members": [
    {
      "userId": "openid_xxx",
      "nickname": "小明",
      "avatarUrl": "...",
      "role": 1,
      "latitude": 39.9042,
      "longitude": 116.4074,
      "lastLocationAt": "2026-04-15T16:43:00Z",
      "isOnline": true,
      "joinedAt": "2026-04-15T16:00:00Z"
    },
    {
      "userId": "openid_yyy",
      "nickname": "小红",
      "avatarUrl": "...",
      "role": 2,
      "latitude": 39.91,
      "longitude": 116.42,
      "lastLocationAt": "2026-04-15T16:42:50Z",
      "isOnline": true,
      "joinedAt": "2026-04-15T16:05:00Z"
    }
  ],
  "manualFriends": [
    {
      "id": "mf_xxx",
      "name": "小刚",
      "latitude": 39.92,
      "longitude": 116.41,
      "address": "海淀区xxx",
      "addedBy": "openid_xxx",
      "createdAt": "2026-04-15T16:10:00Z"
    }
  ],
  "meetPoint": {
    "id": "poi_xxx",
    "name": "星巴克(国贸店)",
    "type": "咖啡店",
    "address": "朝阳区建国路xxx",
    "tel": "010-12345678",
    "latitude": 39.908,
    "longitude": 116.413,
    "setBy": "openid_xxx",
    "setAt": "2026-04-15T16:20:00Z"
  },
  "maxMembers": 20,
  "createdAt": "2026-04-15T16:00:00Z",
  "expireAt": "2026-04-16T16:00:00Z",
  "endedAt": null
}
```

> **优势**：一个碰头的所有数据在一个文档里，查询效率高，且可直接用 `watch` 实时监听变化推送到所有成员端。

---

## 六、云函数设计

| 云函数 | 触发方式 | 功能 |
|--------|---------|------|
| `login` | 小程序调用 | 微信登录 → 获取 openid → 创建/更新用户 |
| `createMeeting` | 小程序调用 | 创建碰头活动 |
| `joinMeeting` | 小程序调用 | 加入碰头（校验碰头码、人数限制） |
| `updateLocation` | 小程序调用 | 上报位置（更新 members 数组中对应成员的坐标） |
| `addManualFriend` | 小程序调用 | 添加手动好友 |
| `removeManualFriend` | 小程序调用 | 删除手动好友 |
| `setMeetPoint` | 小程序调用 | 设置碰头地点 |
| `removeMeetPoint` | 小程序调用 | 取消碰头地点 |
| `endMeeting` | 小程序调用 | 结束碰头 |
| `leaveMeeting` | 小程序调用 | 退出碰头 |
| `cleanExpired` | 定时触发（每小时） | 清理过期碰头（status → 3） |

### 云函数示例：`updateLocation`

```javascript
// cloudfunctions/updateLocation/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { meetingId, latitude, longitude } = event;

  // 原子更新：只更新当前用户在 members 数组中的位置
  const res = await db.collection('meetings').doc(meetingId).update({
    data: {
      'members.$[elem].latitude': latitude,
      'members.$[elem].longitude': longitude,
      'members.$[elem].lastLocationAt': db.serverDate(),
      'members.$[elem].isOnline': true
    },
    arrayFilters: [{ 'elem.userId': OPENID }]
  });

  // 注意：云开发 MongoDB 不支持 arrayFilters，
  // 实际需要先读取文档，修改后写回，或使用云函数内 JS 操作：
  const doc = await db.collection('meetings').doc(meetingId).get();
  const meeting = doc.data;
  const member = meeting.members.find(m => m.userId === OPENID);
  if (member) {
    member.latitude = latitude;
    member.longitude = longitude;
    member.lastLocationAt = new Date();
    member.isOnline = true;
    await db.collection('meetings').doc(meetingId).update({
      data: { members: meeting.members }
    });
  }

  return { ok: true };
};
```

---

## 七、安全设计

### 7.1 鉴权
- 小程序端通过 `wx.login()` 获取 code
- 云函数通过 `cloud.getWXContext().OPENID` 获取用户身份
- 所有写操作校验用户是否是碰头成员

### 7.2 数据权限
- 碰头数据只有成员可读写
- 位置数据只有本人可更新
- 碰头地点只有成员可设置
- 结束碰头只有发起人可操作

### 7.3 防滥用
- 每人同时只能参与 1 个碰头
- 碰头最多 20 人
- 碰头 24 小时自动过期
- 位置上报频率限制 5 秒/次

---

## 八、前端改造要点

当前前端使用 `wx.setStorageSync` 本地存储，改造为云开发后需要：

1. **`utils/meeting.js`** → 改为调用云函数
2. **位置上报** → 改为调用 `updateLocation` 云函数
3. **数据监听** → 使用 `db.collection('meetings').doc(id).watch()` 替代定时轮询
4. **登录** → `app.js` 的 `onLaunch` 中增加微信登录和云函数 `login` 调用
5. **分享加入** → `onShareAppMessage` 返回的路径携带 meetingId

---

## 九、项目目录结构（云开发版本）

```
meetpoint-miniapp/
├── cloudfunctions/           # 云函数
│   ├── login/
│   ├── createMeeting/
│   ├── joinMeeting/
│   ├── updateLocation/
│   ├── addManualFriend/
│   ├── removeManualFriend/
│   ├── setMeetPoint/
│   ├── removeMeetPoint/
│   ├── endMeeting/
│   ├── leaveMeeting/
│   └── cleanExpired/         # 定时触发器
├── miniprogram/              # 小程序前端
│   ├── pages/
│   ├── utils/
│   ├── images/
│   └── app.js
├── project.config.json
└── docs/
    └── backend-design.md     # 本文档
```
