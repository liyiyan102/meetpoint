// 云函数：joinMeeting — 加入碰头
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 按 _id 或按字段查找碰头文档
async function findMeeting(meetingId) {
  try {
    const res = await db.collection('meetings').doc(meetingId).get();
    return res.data;
  } catch (e) {}
  try {
    const res = await db.collection('meetings').where({ meetingCode: meetingId }).get();
    if (res.data && res.data.length > 0) return res.data[0];
  } catch (e) {}
  return null;
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId } = event;

  if (!meetingId) {
    return { ok: false, msg: '碰头码不能为空' };
  }

  const meeting = await findMeeting(meetingId);
  if (!meeting) {
    return { ok: false, msg: '碰头活动不存在', debug: { meetingId } };
  }

  // 文档的真实 _id（可能和碰头码不同）
  const docId = meeting._id;

  if (meeting.status !== 1) {
    return { ok: false, msg: '碰头已结束' };
  }

  if (meeting.expireAt && new Date(meeting.expireAt) < new Date()) {
    return { ok: false, msg: '碰头已过期' };
  }

  const existing = (meeting.members || []).find(m => m.userId === openid);
  if (existing) {
    return { ok: true, meetingId, msg: '你已在此碰头中' };
  }

  if ((meeting.members || []).length >= (meeting.maxMembers || 20)) {
    return { ok: false, msg: '碰头已满（最多' + (meeting.maxMembers || 20) + '人）' };
  }

  // 获取用户信息
  let user = {};
  try {
    const res = await db.collection('users').doc(openid).get();
    user = res.data;
  } catch (e) {}

  const newMember = {
    userId: openid,
    nickname: user.nickname || event.nickname || '好友',
    avatarUrl: user.avatarUrl || event.avatarUrl || '',
    role: 2,
    latitude: null,
    longitude: null,
    lastLocationAt: null,
    isOnline: false,
    joinedAt: new Date()
  };

  await db.collection('meetings').doc(docId).update({
    data: {
      members: db.command.push(newMember)
    }
  });

  return { ok: true, meetingId };
};
