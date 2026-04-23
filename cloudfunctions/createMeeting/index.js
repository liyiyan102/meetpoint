// 云函数：createMeeting — 创建碰头活动
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 生成 6 位碰头码
function generateMeetingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;

  // 获取用户信息
  let user = {};
  try {
    const res = await db.collection('users').doc(openid).get();
    user = res.data;
  } catch (e) {}

  // 生成唯一碰头码（重试最多 5 次）
  let meetingId = '';
  for (let i = 0; i < 5; i++) {
    meetingId = generateMeetingId();
    try {
      await db.collection('meetings').doc(meetingId).get();
      meetingId = ''; // 已存在，重试
    } catch (e) {
      break; // 不存在，可用
    }
  }
  if (!meetingId) {
    return { ok: false, msg: '创建失败，请重试' };
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 小时后过期

  const meeting = {
    _id: meetingId,
    creatorId: openid,
    status: 1, // 1=进行中
    members: [{
      userId: openid,
      nickname: user.nickname || event.nickname || '我',
      avatarUrl: user.avatarUrl || event.avatarUrl || '',
      role: 1, // 1=发起人
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

  await db.collection('meetings').add({ data: meeting });

  return {
    ok: true,
    meetingId: meetingId,
    expireAt: expireAt.toISOString()
  };
};
