// 云函数：addManualFriend — 添加手动好友位置
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId, name, latitude, longitude, address } = event;

  if (!meetingId || !name || latitude === undefined || longitude === undefined) {
    return { ok: false, msg: '参数不完整' };
  }

  // 校验是否为碰头成员
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

  const friendId = 'mf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const friend = {
    id: friendId,
    name: name,
    latitude: latitude,
    longitude: longitude,
    address: address || '',
    addedBy: openid,
    createdAt: new Date()
  };

  await db.collection('meetings').doc(meetingId).update({
    data: {
      manualFriends: db.command.push(friend)
    }
  });

  return { ok: true, friend };
};
