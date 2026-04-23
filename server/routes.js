/**
 * 路由：将 11 个云函数映射为 HTTP POST 接口
 * 
 * 前端通过 header: x-wx-openid 传递用户身份
 * 所有接口统一 POST /api/{functionName}
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('./db');

// ============================================================
// 辅助函数
// ============================================================

// 生成 6 位碰头码
function generateMeetingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 按 _id 或 meetingCode 查找碰头
async function findMeeting(db, meetingId) {
  let doc = await db.collection('meetings').findOne({ _id: meetingId });
  if (doc) return doc;
  doc = await db.collection('meetings').findOne({ meetingCode: meetingId });
  return doc || null;
}

// ============================================================
// 1. login — 登录 / 更新用户信息
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });

    const db = getDB();
    const users = db.collection('users');

    if (req.body.action === 'updateProfile') {
      const updateData = { updatedAt: new Date(), lastActiveAt: new Date() };
      if (req.body.nickname !== undefined) updateData.nickname = req.body.nickname;
      if (req.body.avatarUrl !== undefined) {
        const av = String(req.body.avatarUrl || '');
        // 防御性校验：拒绝临时路径污染数据库
        if (av && (av.indexOf('wxfile') >= 0 || av.indexOf('http://tmp/') >= 0 || av.indexOf('/tmp/') >= 0)) {
          console.warn('[login.updateProfile] 拒绝保存临时头像路径:', av);
          return res.json({ ok: false, msg: '头像为临时路径，请先上传' });
        }
        updateData.avatarUrl = av;
      }

      const result = await users.updateOne({ _id: openid }, { $set: updateData });
      if (result.matchedCount === 0) {
        await users.insertOne({
          _id: openid,
          nickname: req.body.nickname || '',
          avatarUrl: updateData.avatarUrl || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date()
        });
      }
      return res.json({ openid, ok: true });
    }

    // 默认：登录
    let user = await users.findOne({ _id: openid });
    if (!user) {
      user = {
        _id: openid,
        nickname: '',
        avatarUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date()
      };
      await users.insertOne(user);
    } else {
      await users.updateOne({ _id: openid }, { $set: { lastActiveAt: new Date() } });
    }
    res.json({ openid, user });
  } catch (e) {
    console.error('[login]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 2. createMeeting — 创建碰头
// ============================================================
router.post('/createMeeting', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });

    const db = getDB();
    let user = {};
    try { user = await db.collection('users').findOne({ _id: openid }) || {}; } catch (e) {}

    // 生成唯一碰头码
    let meetingId = '';
    for (let i = 0; i < 5; i++) {
      meetingId = generateMeetingId();
      const exists = await db.collection('meetings').findOne({ _id: meetingId });
      if (!exists) break;
      meetingId = '';
    }
    if (!meetingId) return res.json({ ok: false, msg: '创建失败，请重试' });

    const now = new Date();
    const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const meeting = {
      _id: meetingId,
      creatorId: openid,
      status: 1,
      members: [{
        userId: openid,
        nickname: user.nickname || req.body.nickname || '我',
        avatarUrl: user.avatarUrl || req.body.avatarUrl || '',
        role: 1,
        latitude: null,
        longitude: null,
        lastLocationAt: null,
        isOnline: false,
        joinedAt: new Date()
      }],
      manualFriends: [],
      meetPoint: null,
      maxMembers: 20,
      createdAt: new Date(),
      expireAt: expireAt,
      endedAt: null
    };

    await db.collection('meetings').insertOne(meeting);
    res.json({ ok: true, meetingId, expireAt: expireAt.toISOString() });
  } catch (e) {
    console.error('[createMeeting]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 3. joinMeeting — 加入碰头
// ============================================================
router.post('/joinMeeting', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId } = req.body;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });
    if (!meetingId) return res.json({ ok: false, msg: '碰头码不能为空' });

    const db = getDB();
    const meeting = await findMeeting(db, meetingId);
    if (!meeting) return res.json({ ok: false, msg: '碰头活动不存在' });

    const docId = meeting._id;
    if (meeting.status !== 1) return res.json({ ok: false, msg: '碰头已结束' });
    if (meeting.expireAt && new Date(meeting.expireAt) < new Date()) return res.json({ ok: false, msg: '碰头已过期' });

    const existing = (meeting.members || []).find(m => m.userId === openid);
    if (existing) return res.json({ ok: true, meetingId, msg: '你已在此碰头中' });

    if ((meeting.members || []).length >= (meeting.maxMembers || 20)) {
      return res.json({ ok: false, msg: '碰头已满（最多' + (meeting.maxMembers || 20) + '人）' });
    }

    let user = {};
    try { user = await db.collection('users').findOne({ _id: openid }) || {}; } catch (e) {}

    const newMember = {
      userId: openid,
      nickname: user.nickname || req.body.nickname || '好友',
      avatarUrl: user.avatarUrl || req.body.avatarUrl || '',
      role: 2,
      latitude: null,
      longitude: null,
      lastLocationAt: null,
      isOnline: false,
      joinedAt: new Date()
    };

    await db.collection('meetings').updateOne(
      { _id: docId },
      { $push: { members: newMember } }
    );
    res.json({ ok: true, meetingId });
  } catch (e) {
    console.error('[joinMeeting]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 4. getMeeting — 获取碰头详情
// ============================================================
router.post('/getMeeting', async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return res.json({ ok: false, msg: '碰头码不能为空' });

    const db = getDB();
    const meeting = await findMeeting(db, meetingId);
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });

    // 实时从 users 表关联每个成员的最新头像和昵称
    // （避免用户更新头像后，旧的 meeting 成员记录仍显示旧/空头像）
    const memberIds = (meeting.members || []).map(m => m.userId).filter(Boolean);
    let userMap = {};
    if (memberIds.length) {
      try {
        const userList = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
        userList.forEach(u => { userMap[u._id] = u; });
      } catch (e) {
        console.error('[getMeeting] 关联 users 表失败', e);
      }
    }

    // 更新在线状态，并合并最新 avatarUrl / nickname
    const now = Date.now();
    (meeting.members || []).forEach(m => {
      if (m.lastLocationAt) {
        const lastTime = new Date(m.lastLocationAt).getTime();
        m.isOnline = (now - lastTime) < 30000;
      }
      const u = userMap[m.userId];
      if (u) {
        if (u.avatarUrl) m.avatarUrl = u.avatarUrl;  // 用 users 表的最新头像覆盖
        if (u.nickname) m.nickname = u.nickname;     // 昵称也用最新的
      }
    });
    res.json({ ok: true, meeting });
  } catch (e) {
    console.error('[getMeeting]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 5. endMeeting — 结束碰头
// ============================================================
router.post('/endMeeting', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId } = req.body;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (meeting.creatorId !== openid) return res.json({ ok: false, msg: '只有发起人可以结束碰头' });

    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { status: 2, endedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[endMeeting]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 6. leaveMeeting — 退出碰头
// ============================================================
router.post('/leaveMeeting', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId } = req.body;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (meeting.creatorId === openid) return res.json({ ok: false, msg: '发起人请使用"结束碰头"' });

    const updatedMembers = meeting.members.filter(m => m.userId !== openid);
    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { members: updatedMembers } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[leaveMeeting]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 7. updateLocation — 上报位置
// ============================================================
router.post('/updateLocation', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId, latitude, longitude } = req.body;
    if (!openid || !meetingId || latitude === undefined || longitude === undefined) {
      return res.json({ ok: false, msg: '参数不完整' });
    }

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (meeting.status !== 1) return res.json({ ok: false, msg: '碰头已结束' });

    const members = meeting.members;
    const member = members.find(m => m.userId === openid);
    if (!member) return res.json({ ok: false, msg: '你不在此碰头中' });

    member.latitude = latitude;
    member.longitude = longitude;
    member.lastLocationAt = new Date();
    member.isOnline = true;

    const now = Date.now();
    members.forEach(m => {
      if (m.userId !== openid && m.lastLocationAt) {
        const lastTime = new Date(m.lastLocationAt).getTime();
        m.isOnline = (now - lastTime) < 30000;
      }
    });

    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { members } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[updateLocation]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 8. setMeetPoint — 设置碰头地点
// ============================================================
router.post('/setMeetPoint', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId, place } = req.body;
    if (!openid || !meetingId || !place || !place.latitude || !place.longitude) {
      return res.json({ ok: false, msg: '参数不完整' });
    }

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (!meeting.members.find(m => m.userId === openid)) {
      return res.json({ ok: false, msg: '你不在此碰头中' });
    }

    const meetPoint = {
      id: place.id || ('mp_' + Date.now()),
      name: place.name || '碰头地点',
      type: place.type || '',
      address: place.address || '',
      tel: place.tel || '',
      rating: place.rating || '',
      latitude: place.latitude,
      longitude: place.longitude,
      setBy: openid,
      setAt: new Date()
    };

    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { meetPoint } }
    );
    res.json({ ok: true, meetPoint });
  } catch (e) {
    console.error('[setMeetPoint]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 9. removeMeetPoint — 取消碰头地点
// ============================================================
router.post('/removeMeetPoint', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId } = req.body;
    if (!openid) return res.json({ ok: false, msg: '缺少 openid' });

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (!meeting.members.find(m => m.userId === openid)) {
      return res.json({ ok: false, msg: '你不在此碰头中' });
    }

    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { meetPoint: null } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[removeMeetPoint]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 10. addManualFriend — 添加手动好友
// ============================================================
router.post('/addManualFriend', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId, name, latitude, longitude, address } = req.body;
    if (!openid || !meetingId || !name || latitude === undefined || longitude === undefined) {
      return res.json({ ok: false, msg: '参数不完整' });
    }

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (!meeting.members.find(m => m.userId === openid)) {
      return res.json({ ok: false, msg: '你不在此碰头中' });
    }

    const friendId = 'mf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const friend = {
      id: friendId,
      name,
      latitude,
      longitude,
      address: address || '',
      addedBy: openid,
      createdAt: new Date()
    };

    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $push: { manualFriends: friend } }
    );
    res.json({ ok: true, friend });
  } catch (e) {
    console.error('[addManualFriend]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 11. removeManualFriend — 删除手动好友
// ============================================================
router.post('/removeManualFriend', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || req.body.openid;
    const { meetingId, friendId } = req.body;
    if (!openid || !meetingId || !friendId) {
      return res.json({ ok: false, msg: '参数不完整' });
    }

    const db = getDB();
    const meeting = await db.collection('meetings').findOne({ _id: meetingId });
    if (!meeting) return res.json({ ok: false, msg: '碰头不存在' });
    if (!meeting.members.find(m => m.userId === openid)) {
      return res.json({ ok: false, msg: '你不在此碰头中' });
    }

    const updatedFriends = meeting.manualFriends.filter(f => f.id !== friendId);
    await db.collection('meetings').updateOne(
      { _id: meetingId },
      { $set: { manualFriends: updatedFriends } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[removeManualFriend]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 12. uploadAvatar — 头像上传
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const openid = req.headers['x-wx-openid'] || 'unknown';
    cb(null, openid + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/uploadAvatar', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.json({ ok: false, msg: '没有文件' });
    const url = '/uploads/avatars/' + req.file.filename;
    res.json({ ok: true, url });
  } catch (e) {
    console.error('[uploadAvatar]', e);
    res.json({ ok: false, msg: e.message });
  }
});

// ============================================================
// 诊断：查看 meeting 里每个成员的 avatarUrl / users 表现状
// GET /api/debug/meeting/:meetingId
// ============================================================
router.get('/debug/meeting/:meetingId', async (req, res) => {
  try {
    const db = getDB();
    const meeting = await findMeeting(db, req.params.meetingId);
    if (!meeting) return res.json({ ok: false, msg: 'meeting 不存在' });

    const memberIds = (meeting.members || []).map(m => m.userId);
    const users = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });

    const report = (meeting.members || []).map(m => ({
      userId: m.userId,
      nickname_in_meeting: m.nickname,
      avatarUrl_in_meeting: m.avatarUrl || '(空)',
      nickname_in_users: userMap[m.userId] ? userMap[m.userId].nickname : '(users表无记录)',
      avatarUrl_in_users: userMap[m.userId] ? (userMap[m.userId].avatarUrl || '(空)') : '(users表无记录)',
    }));

    res.json({ ok: true, meetingId: meeting._id, members: report });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

module.exports = router;
