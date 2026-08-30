const app = getApp();
const meetingManager = require('../../utils/meeting');

const DEFAULT_AVATAR = '/images/avatar-default@2x.png';

Page({
  data: {
    defaultAvatar: DEFAULT_AVATAR,
    avatarUrl: '',
    nickname: '',
    activeMeeting: null,
    isCreator: false,
    inputFocused: false,
    loading: false,
    // 是否自动聚焦昵称输入框（用于刚选完头像时引导用户填昵称）
    nicknameFocus: false,
    // 昵称输入框高亮闪烁（引导用户注意这里）
    nicknameHighlight: false
  },

  onLoad() {
    const info = app.globalData.userInfo || {};
    this.setData({
      avatarUrl: info.avatarUrl || '',
      nickname: info.nickname || ''
    });
  },

  async onShow() {
    // 等待登录完成
    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }
    const info = app.globalData.userInfo || {};
    this.setData({
      avatarUrl: info.avatarUrl || this.data.avatarUrl,
      nickname: info.nickname || this.data.nickname
    });

    // 检查是否有活跃碰头
    const mid = app.globalData.activeMeetingId;
    if (mid) {
      // 先用本地缓存展示，同时异步拉取最新
      const cached = meetingManager.getMeeting(mid);
      if (cached && cached.status === 1) {
        const iAmCreator = cached.creatorId === (app.globalData.userInfo && app.globalData.userInfo.userId);
        // 提取发起人名称和碰面地点
        const creator = (cached.members || []).find(m => m.isCreator);
        cached.creatorName = creator ? creator.nickname : '';
        cached.meetPointName = (cached.meetPoint && cached.meetPoint.name) || '';
        // 合并真实成员和手动好友计算总人数
        cached.totalCount = (cached.members || []).length + (cached.manualFriends || []).length;
        this.setData({ activeMeeting: cached, isCreator: iAmCreator });
      }
      // 异步更新
      try {
        const m = await meetingManager.getMeetingAsync(mid);
        if (m && m.status === 1) {
          const iAmCreator = m.creatorId === (app.globalData.userInfo && app.globalData.userInfo.userId);
          const creator = (m.members || []).find(mem => mem.isCreator);
          m.creatorName = creator ? creator.nickname : '';
          m.meetPointName = (m.meetPoint && m.meetPoint.name) || '';
          // 合并真实成员和手动好友计算总人数
          m.totalCount = (m.members || []).length + (m.manualFriends || []).length;
          this.setData({ activeMeeting: m, isCreator: iAmCreator });
        } else {
          app.setActiveMeeting(null);
          this.setData({ activeMeeting: null });
        }
      } catch (e) {
        // 网络异常继续用缓存
        if (!cached) {
          app.setActiveMeeting(null);
          this.setData({ activeMeeting: null });
        }
      }
    } else {
      this.setData({ activeMeeting: null });
    }
  },

  // 顶部「我的信息」卡片里的头像按钮（已有头像时用户想换）
  onChooseAvatar(e) {
    const url = e.detail.avatarUrl;
    if (url) {
      this.setData({ avatarUrl: url });
      app.saveUserInfo({ avatarUrl: url });
    }
  },

  // ========== 底部按钮：未授权场景 ==========

  // 【未授权 - 无头像】点底部按钮直接触发微信原生 chooseAvatar
  onLaunchChooseAvatar(e) {
    const url = e && e.detail && e.detail.avatarUrl;
    if (!url) return;
    // 先把头像显示到顶部
    this.setData({ avatarUrl: url });
    app.saveUserInfo({ avatarUrl: url });
    // 如果还没昵称：自动聚焦顶部昵称输入框 + 高亮闪烁
    if (!this.data.nickname) {
      this._highlightNickname('输入昵称后自动发起碰头');
    }
  },

  // 【未授权 - 有头像无昵称】点按钮自动聚焦昵称输入框
  onLaunchNeedNickname() {
    this._highlightNickname('输入昵称后自动发起碰头');
  },

  // 聚焦昵称输入框 + 高亮闪烁提示
  _highlightNickname(tip) {
    // focus 需要先设为 false 再设为 true 才能重复触发
    this.setData({ nicknameFocus: false, nicknameHighlight: true });
    setTimeout(() => {
      this.setData({ nicknameFocus: true });
    }, 50);
    // 2 秒后取消高亮
    setTimeout(() => {
      this.setData({ nicknameHighlight: false });
    }, 2000);
    wx.showToast({ title: tip || '请在上方输入昵称', icon: 'none', duration: 2000 });
  },

  // 【调试】长按 logo 重置当前用户资料（仅测试用，发布前可删除）
  onDevReset() {
    wx.showModal({
      title: '开发调试',
      content: '清空当前账号的头像和昵称？\n（仅清除本地和数据库里你自己的资料，不影响其他人）',
      confirmText: '重置',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const api = require('../../utils/api');
          await api.callFunction('login', {
            action: 'updateProfile',
            nickname: '',
            avatarUrl: ''
          });
        } catch (e) {
          console.warn('[重置] 服务端清空失败:', e);
        }
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = '';
          app.globalData.userInfo.avatarUrl = '';
          wx.setStorageSync('userInfo', app.globalData.userInfo);
        }
        this.setData({ avatarUrl: '', nickname: '' });
        wx.showToast({ title: '已重置', icon: 'success' });
      }
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e) {
    const name = (e.detail.value || '').trim();
    this.setData({ inputFocused: false, nicknameFocus: false });
    if (name) {
      this.setData({ nickname: name });
      app.saveUserInfo({ nickname: name });
      // 如果有头像 + 没有进行中的碰头 + 不在 loading → 自动发起碰头
      if (this.data.avatarUrl && !this.data.activeMeeting && !this.data.loading) {
        // 延迟一点执行，让 saveUserInfo 先落库 + 高亮样式取消
        setTimeout(() => {
          this.onCreateMeeting();
        }, 200);
      }
    }
  },

  onNicknameFocus() {
    this.setData({ inputFocused: true });
  },

  // 发起碰头（点击底部按钮 - 已授权路径）
  async onCreateMeeting() {
    if (this.data.activeMeeting) {
      wx.showToast({ title: '请先结束当前碰头', icon: 'none' });
      return;
    }
    const info = app.globalData.userInfo;
    if (!info || !info.nickname) {
      wx.showToast({ title: '请先设置昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const result = await meetingManager.createMeeting(info);
      if (result && result.ok) {
        app.setActiveMeeting(result.id);
        wx.navigateTo({ url: '/pages/map/map?id=' + result.id + '&role=creator' });
      } else {
        wx.showToast({ title: '创建失败，请重试', icon: 'none' });
      }
    } catch (e) {
      console.error('创建碰头失败:', e);
      var errMsg = (e && e.message) || '网络异常';
      // 提取更友好的错误信息
      if (errMsg.indexOf('request:fail') >= 0 || errMsg.indexOf('fail') >= 0) {
        errMsg = '网络连接失败，请检查网络';
      } else if (errMsg.indexOf('HTTP') >= 0) {
        errMsg = '服务器异常(' + errMsg + ')';
      }
      wx.showToast({ title: errMsg, icon: 'none', duration: 3000 });
    }
    this.setData({ loading: false });
  },

  // 继续已有碰头
  onResumeMeeting() {
    const m = this.data.activeMeeting;
    if (!m) return;
    const isCreator = m.creatorId === (app.globalData.userInfo && app.globalData.userInfo.userId);
    wx.navigateTo({ url: '/pages/map/map?id=' + m.id + '&role=' + (isCreator ? 'creator' : 'member') });
  },

  // 结束碰头（发起人）或退出碰头（成员）
  onEndOrLeaveMeeting() {
    const isCreator = this.data.isCreator;
    const title = isCreator ? '结束碰头' : '退出碰头';
    const content = isCreator ? '确定要结束当前碰头活动吗？所有人都会退出。' : '确定要退出当前碰头吗？';
    wx.showModal({
      title,
      content,
      success: async (res) => {
        if (res.confirm) {
          const mid = app.globalData.activeMeetingId;
          if (mid) {
            if (isCreator) {
              meetingManager.deleteMeeting(mid);
            } else {
              try {
                const api = require('../../utils/api');
                await api.callFunction('leaveMeeting', { meetingId: mid });
              } catch (e) {
                console.warn('退出碰头失败:', e);
              }
            }
          }
          app.setActiveMeeting(null);
          this.setData({ activeMeeting: null, isCreator: false });
          wx.showToast({ title: isCreator ? '已结束' : '已退出', icon: 'success' });
        }
      }
    });
  },

  // ========== 分享 ==========

  // 转发给好友 / 群（右上角胶囊菜单 → 转发；或带 open-type="share" 的按钮）
  onShareAppMessage() {
    const info = app.globalData.userInfo || {};
    const userName = info.nickname || '好友';
    const active = this.data.activeMeeting;

    // 如果有进行中的碰头：分享卡片直接拉对方进同一个碰头
    if (active && active.meetingId) {
      const memberCount = (active.members && active.members.length) || 1;
      const poiName = active.meetPointName || '';
      let title;
      if (poiName) {
        title = userName + '约你在' + poiName + '碰面，路线已规划好！';
      } else if (memberCount > 1) {
        title = userName + '和' + (memberCount - 1) + '个朋友在等你，快来碰面！';
      } else {
        title = userName + '发起了碰面，帮你规划最佳路线';
      }
      return {
        title,
        path: '/pages/join/join?id=' + active.meetingId
          + '&inviter=' + encodeURIComponent(userName)
          + '&count=' + memberCount
          + '&poi=' + encodeURIComponent(poiName)
      };
    }

    // 没有进行中的碰头：分享小程序首页，让朋友直接体验
    return {
      title: '约个地儿｜多人实时位置 · 智能推荐碰头点',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（部分基础库版本支持）
  onShareTimeline() {
    return {
      title: '约个地儿｜帮一群人快速定个碰头地点',
      query: ''
    };
  }
});
