// 云函数：endMeeting — 结束碰头（仅发起人）
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

  if (meeting.creatorId !== openid) {
    return { ok: false, msg: '只有发起人可以结束碰头' };
  }

  await db.collection('meetings').doc(meetingId).update({
    data: {
      status: 2, // 2=已结束
      endedAt: db.serverDate()
    }
  });

  return { ok: true };
};
