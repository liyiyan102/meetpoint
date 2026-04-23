// 云函数：removeMeetPoint — 取消碰头地点
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId } = event;

  let meeting;
  try {
    const res = await db.collection('meetings').doc(meetingId).get();
    meeting = res.data;
  } catch (e) {
    return { ok: false, msg: '碰头不存在' };
  }

  if (!meeting.members.find(m => m.userId === openid)) {
    return { ok: false, msg: '你不在此碰头中' };
  }

  await db.collection('meetings').doc(meetingId).update({
    data: { meetPoint: null }
  });

  return { ok: true };
};
