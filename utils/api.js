/**
 * API 适配层 — 用 wx.request 替代 wx.cloud.callFunction
 */

const BASE_URL = 'https://meetpoint.top/api';

function getOpenid() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.userId) {
      return app.globalData.userInfo.userId;
    }
  } catch (e) {}
  return wx.getStorageSync('userId') || '';
}

/**
 * 调用后端 API
 * @param {string} name  函数名
 * @param {object} data  参数
 * @returns {Promise<object>}
 */
function callFunction(name, data) {
  const openid = getOpenid();
  // 将 openid 同时放入 header 和 body，确保服务端一定能拿到
  const body = Object.assign({}, data || {});
  if (!body.openid && openid) {
    body.openid = openid;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + '/' + name,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'x-wx-openid': openid
      },
      data: body,
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail(err) {
        console.error('[API] ' + name + ' fail:', err);
        reject(err);
      }
    });
  });
}

module.exports = { callFunction, BASE_URL };
