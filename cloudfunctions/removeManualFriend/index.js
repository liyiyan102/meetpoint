// 云函数：removeManualFriend — 删除手动好友
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId, friendId } = event;

  if (!meetingId || !friendId) {
    return { ok: false, msg: '参数不完整' };
  }

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

  const updatedFriends = meeting.manualFriends.filter(f => f.id !== friendId);

  await db.collection('meetings').doc(meetingId).update({
    data: { manualFriends: updatedFriends }
  });

  return { ok: true };
};
