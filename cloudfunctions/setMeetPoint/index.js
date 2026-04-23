// 云函数：setMeetPoint — 设置碰头地点
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { meetingId, place } = event;

  if (!meetingId || !place || !place.latitude || !place.longitude) {
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

  await db.collection('meetings').doc(meetingId).update({
    data: { meetPoint: meetPoint }
  });

  return { ok: true, meetPoint };
};
