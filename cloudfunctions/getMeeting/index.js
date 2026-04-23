// 云函数：getMeeting — 获取碰头详情
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 按 _id 或按 meetingId 字段查找碰头文档
async function findMeeting(meetingId) {
  // 先按 _id 精确查
  try {
    const res = await db.collection('meetings').doc(meetingId).get();
    return res.data;
  } catch (e) {}

  // 兜底：按字段查（兼容旧数据）
  try {
    const res = await db.collection('meetings').where({ meetingCode: meetingId }).get();
    if (res.data && res.data.length > 0) return res.data[0];
  } catch (e) {}

  return null;
}

exports.main = async (event, context) => {
  const { meetingId } = event;

  if (!meetingId) {
    return { ok: false, msg: '碰头码不能为空' };
  }

  const meeting = await findMeeting(meetingId);
  if (!meeting) {
    return { ok: false, msg: '碰头不存在', debug: { meetingId } };
  }

  // 更新在线状态
  const now = Date.now();
  (meeting.members || []).forEach(m => {
    if (m.lastLocationAt) {
      const lastTime = new Date(m.lastLocationAt).getTime();
      m.isOnline = (now - lastTime) < 30000;
    }
  });

  return { ok: true, meeting };
};
