// 云函数：leaveMeeting — 退出碰头
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

  // 发起人不能退出，只能结束
  if (meeting.creatorId === openid) {
    return { ok: false, msg: '发起人请使用"结束碰头"' };
  }

  const updatedMembers = meeting.members.filter(m => m.userId !== openid);

  await db.collection('meetings').doc(meetingId).update({
    data: { members: updatedMembers }
  });

  return { ok: true };
};
