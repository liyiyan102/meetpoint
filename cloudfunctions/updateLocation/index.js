// 云函数：updateLocation — 上报位置
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId, latitude, longitude } = event;

  if (!meetingId || latitude === undefined || longitude === undefined) {
    return { ok: false, msg: '参数不完整' };
  }

  // 读取碰头数据
  let meeting;
  try {
    const res = await db.collection('meetings').doc(meetingId).get();
    meeting = res.data;
  } catch (e) {
    return { ok: false, msg: '碰头不存在' };
  }

  if (meeting.status !== 1) {
    return { ok: false, msg: '碰头已结束' };
  }

  // 更新对应成员的位置
  const members = meeting.members;
  const member = members.find(m => m.userId === openid);
  if (!member) {
    return { ok: false, msg: '你不在此碰头中' };
  }

  member.latitude = latitude;
  member.longitude = longitude;
  member.lastLocationAt = new Date();
  member.isOnline = true;

  // 顺便更新其他成员的在线状态（超过 30 秒未更新 → 离线）
  const now = Date.now();
  members.forEach(m => {
    if (m.userId !== openid && m.lastLocationAt) {
      const lastTime = new Date(m.lastLocationAt).getTime();
      m.isOnline = (now - lastTime) < 30000;
    }
  });

  await db.collection('meetings').doc(meetingId).update({
    data: { members: members }
  });

  return { ok: true };
};
