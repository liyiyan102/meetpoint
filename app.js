const api = require('./utils/api');

App({
  globalData: {
    // 腾讯地图 WebService API Key
    mapKey: 'TO7BZ-NEGKA-C5HKG-CSNZU-DONB6-5EBWM',
    // 后端服务地址
    serverUrl: 'https://meetpoint.top/api',
    // 用户信息
    userInfo: null, // { userId(openid), nickname, avatarUrl }
    // 当前活动的碰头 ID
    activeMeetingId: null,
    // 登录就绪 Promise
    loginReady: null
  },

  onLaunch() {
    // 兼容：如果有云开发环境，仍然初始化（可选）
    if (wx.cloud) {
      try {
        wx.cloud.init({ env: 'cloud1-9glklzu49714110d', traceUser: true });
      } catch (e) {}
    }

    // 登录流程
    this.globalData.loginReady = this._login();
  },

  // 登录 → 调用自建服务器 API
  async _login() {
    try {
      // 先确保本地有 userId
      let userId = wx.getStorageSync('userId');
      if (!userId) {
        userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        wx.setStorageSync('userId', userId);
      }

      // 恢复本地缓存
      const cachedInfo = wx.getStorageSync('userInfo') || {};
      // 清洗：老版本可能把 wxfile 临时路径存入缓存，这种路径在新会话里无效，直接丢弃
      let cachedAvatar = cachedInfo.avatarUrl || '';
      if (cachedAvatar &&
          (cachedAvatar.indexOf('wxfile') >= 0 || cachedAvatar.indexOf('http://tmp/') >= 0 || cachedAvatar.indexOf('/tmp/') >= 0)) {
        console.warn('[登录] 清除无效的临时头像路径:', cachedAvatar);
        cachedAvatar = '';
      }
      const userInfo = {
        userId: userId,
        nickname: cachedInfo.nickname || '',
        avatarUrl: cachedAvatar
      };
      // 先设置本地信息，确保后续请求有 openid
      this.globalData.userInfo = userInfo;

      // 调用自建服务器登录 API
      const loginRes = await api.callFunction('login', { openid: userId });
      if (loginRes.openid) {
        userInfo.userId = loginRes.openid;
      }
      if (loginRes.user) {
        userInfo.nickname = loginRes.user.nickname || userInfo.nickname;
        userInfo.avatarUrl = loginRes.user.avatarUrl || userInfo.avatarUrl;
      }

      this.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('userId', userInfo.userId);

      // 恢复当前活跃碰头
      const activeMeetingId = wx.getStorageSync('activeMeetingId') || null;
      this.globalData.activeMeetingId = activeMeetingId;

      return userInfo;
    } catch (e) {
      console.warn('服务器登录失败，使用本地模式:', e);
      let userId = wx.getStorageSync('userId');
      if (!userId) {
        userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        wx.setStorageSync('userId', userId);
      }
      const userInfo = wx.getStorageSync('userInfo') || {
        userId: userId,
        nickname: '',
        avatarUrl: ''
      };
      userInfo.userId = userId;
      this.globalData.userInfo = userInfo;

      const activeMeetingId = wx.getStorageSync('activeMeetingId') || null;
      this.globalData.activeMeetingId = activeMeetingId;

      return userInfo;
    }
  },

  // 保存用户信息（同步到服务器 + 本地）
  // 策略：wxfile/tmp 临时路径必须先上传换成公网 URL，再保存到 globalData/storage/数据库
  //       绝不允许 wxfile 污染任何持久化存储，保证其他人能看到头像
  async saveUserInfo(info) {
    const rawAvatarUrl = info.avatarUrl;
    const isTempAvatar = rawAvatarUrl &&
      (rawAvatarUrl.indexOf('wxfile') >= 0 || rawAvatarUrl.indexOf('http://tmp/') >= 0 || rawAvatarUrl.indexOf('/tmp/') >= 0);

    // 先组装待保存信息（暂不放 avatarUrl，稍后决定）
    const userInfo = Object.assign({}, this.globalData.userInfo);
    if (info.nickname !== undefined) userInfo.nickname = info.nickname;

    try {
      if (isTempAvatar) {
        // ========= 头像是临时路径：必须先上传 =========
        console.log('[头像上传] 开始上传临时文件:', rawAvatarUrl);
        wx.showLoading({ title: '上传头像中...', mask: true });

        // 带一次自动重试
        const uploadUrl = await this._uploadAvatarWithRetry(rawAvatarUrl, userInfo.userId, 1);

        wx.hideLoading();
        // 统一归一化为完整公网 URL（/api/ 前缀确保 Nginx 代理通畅）
        userInfo.avatarUrl = 'https://meetpoint.top/api' + uploadUrl;
        console.log('[头像上传] 使用服务器URL:', userInfo.avatarUrl);
      } else if (rawAvatarUrl !== undefined) {
        // 明确传入了 avatarUrl 且不是临时路径（比如从服务器恢复的URL）
        userInfo.avatarUrl = rawAvatarUrl;
      }
      // 若 info 中没传 avatarUrl，保留原 globalData 中的值
      if (userInfo.avatarUrl === undefined) {
        userInfo.avatarUrl = (this.globalData.userInfo && this.globalData.userInfo.avatarUrl) || '';
      }

      this.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);

      await api.callFunction('login', {
        action: 'updateProfile',
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl
      });

      console.log('[用户信息] 保存成功');
    } catch (e) {
      wx.hideLoading();
      console.error('[用户信息] 保存失败:', e);

      if (isTempAvatar) {
        // 头像上传失败：给用户明确提示，保持旧头像不变
        let errTip = '头像上传失败';
        const errMsg = (e && e.message) || '';
        if (errMsg.indexOf('域名') >= 0 || errMsg.indexOf('domain') >= 0) {
          errTip = '头像上传失败：请检查域名白名单配置';
        } else if (errMsg.indexOf('SSL') >= 0 || errMsg.indexOf('ssl') >= 0 || errMsg.indexOf('certificate') >= 0) {
          errTip = '头像上传失败：服务器SSL证书异常';
        } else if (errMsg.indexOf('timeout') >= 0) {
          errTip = '头像上传超时，请重试';
        } else {
          errTip = '头像上传失败，请检查网络后重试';
        }

        wx.showToast({ title: errTip, icon: 'none', duration: 3000 });

        // 只保留昵称更新，绝不把 wxfile 路径存入 globalData / storage / 数据库
        if (info.nickname !== undefined && info.nickname !== this.globalData.userInfo.nickname) {
          const keepInfo = Object.assign({}, this.globalData.userInfo, { nickname: info.nickname });
          this.globalData.userInfo = keepInfo;
          wx.setStorageSync('userInfo', keepInfo);
          try {
            await api.callFunction('login', {
              action: 'updateProfile',
              nickname: keepInfo.nickname,
              avatarUrl: keepInfo.avatarUrl || ''
            });
          } catch (_) {}
        }
      } else {
        // 其他信息（昵称等）网络异常：本地先存
        this.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
      }
    }
  },

  // 上传头像（带自动重试）
  _uploadAvatarWithRetry(filePath, openid, retryLeft) {
    return new Promise((resolve, reject) => {
      const doUpload = () => {
        wx.uploadFile({
          url: 'https://meetpoint.top/api/uploadAvatar',
          filePath: filePath,
          name: 'file',
          header: { 'x-wx-openid': openid || '' },
          timeout: 20000,
          success: (res) => {
            console.log('[头像上传] uploadFile success, statusCode:', res.statusCode);
            try {
              const data = JSON.parse(res.data);
              if (data.ok && data.url) {
                console.log('[头像上传] 上传成功:', data.url);
                resolve(data.url);
              } else {
                console.error('[头像上传] 服务器返回错误:', data);
                if (retryLeft > 0) {
                  console.warn('[头像上传] 即将重试，剩余次数:', retryLeft);
                  retryLeft--;
                  setTimeout(doUpload, 1000);
                } else {
                  reject(new Error(data.msg || '服务器返回失败'));
                }
              }
            } catch (e) {
              console.error('[头像上传] 解析响应失败, raw:', res.data);
              if (retryLeft > 0) {
                retryLeft--;
                setTimeout(doUpload, 1000);
              } else {
                reject(new Error('服务器响应异常'));
              }
            }
          },
          fail: (err) => {
            console.error('[头像上传] 请求失败:', JSON.stringify(err));
            const errMsg = (err && err.errMsg) || '';
            // 域名/SSL 问题不重试（重试也没用）
            if (errMsg.indexOf('url not in domain list') >= 0) {
              reject(new Error('域名未配置白名单'));
            } else if (errMsg.indexOf('fail ssl') >= 0 || errMsg.indexOf('certificate') >= 0) {
              reject(new Error('SSL证书错误'));
            } else if (retryLeft > 0) {
              console.warn('[头像上传] 网络问题，即将重试，剩余次数:', retryLeft);
              retryLeft--;
              setTimeout(doUpload, 1500);
            } else {
              reject(err);
            }
          }
        });
      };
      doUpload();
    });
  },

  // 设置当前活跃碰头
  setActiveMeeting(meetingId) {
    this.globalData.activeMeetingId = meetingId;
    if (meetingId) {
      wx.setStorageSync('activeMeetingId', meetingId);
    } else {
      wx.removeStorageSync('activeMeetingId');
    }
  }
});
