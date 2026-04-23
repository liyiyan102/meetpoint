// 云函数：login — 微信登录 & 用户信息管理
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // action: updateProfile — 更新用户信息
  if (event.action === 'updateProfile') {
    const updateData = {};
    if (event.nickname !== undefined) updateData.nickname = event.nickname;
    if (event.avatarUrl !== undefined) updateData.avatarUrl = event.avatarUrl;
    updateData.updatedAt = new Date();
    updateData.lastActiveAt = new Date();

    try {
      await db.collection('users').doc(openid).update({ data: updateData });
    } catch (e) {
      // 用户不存在则创建
      await db.collection('users').add({
        data: {
          _id: openid,
          nickname: event.nickname || '',
          avatarUrl: event.avatarUrl || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date()
        }
      });
    }
    return { openid, ok: true };
  }

  // 默认：登录 — 获取/创建用户
  let user = null;
  try {
    const res = await db.collection('users').doc(openid).get();
    user = res.data;
    // 更新最后活跃时间
    await db.collection('users').doc(openid).update({
      data: { lastActiveAt: new Date() }
    });
  } catch (e) {
    // 新用户，创建记录
    await db.collection('users').add({
      data: {
        _id: openid,
        nickname: '',
        avatarUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date()
      }
    });
  }

  return { openid, user };
};
