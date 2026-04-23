const app = getApp();
const meetingManager = require('../../utils/meeting');

const DEFAULT_AVATAR = '/images/avatar-default@2x.png';

Page({
  data: {
    statusBarHeight: 20,
    meetingId: '',
    creatorName: '',
    creatorAvatar: '',
    memberCount: 0,
    avatarUrl: '',
    nickname: '',
    defaultAvatar: DEFAULT_AVATAR,
    hasProfile: false,
    hasConflict: false,
    loading: false,
    poiName: '',
    poiDistance: '',
    timeAgo: '',
    memberAvatarList: [],
    incentiveText: '',
    showJoinSuccessModal: false,
    isAlreadyMember: false,
    // 头像选择完后，自动聚焦昵称输入框
    nicknameFocus: false
  },

  async onLoad(options) {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });

    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }

    const meetingId = options.id || '';
    const inviter = options.inviter ? decodeURIComponent(options.inviter) : '';
    const count = options.count ? parseInt(options.count) : 0;
    const poi = options.poi ? decodeURIComponent(options.poi) : '';

    this.setData({
      meetingId,
      poiName: poi,
      memberCount: count || 0,
      creatorName: inviter
    });

    const info = app.globalData.userInfo || {};
    const hasProfile = !!(info.nickname);
    this.setData({
      avatarUrl: info.avatarUrl || '',
      nickname: info.nickname || '',
      hasProfile
    });

    const currentActive = app.globalData.activeMeetingId;
    if (currentActive && currentActive !== meetingId) {
      this.setData({ hasConflict: true });
    }

    if (meetingId) {
      this._loadMeetingInfo(meetingId);
    }
  },

  async _loadMeetingInfo(meetingId) {
    try {
      const meeting = await meetingManager.getMeetingAsync(meetingId);
      if (!meeting) return;

      const creator = meeting.members.find(m => m.isCreator);
      const updateData = {
        creatorName: creator ? creator.nickname : this.data.creatorName,
        memberCount: meeting.members.length
      };

      // 检测当前用户是否已在碰头中
      const myUserId = (app.globalData.userInfo && app.globalData.userInfo.userId) || '';
      if (myUserId && meeting.members.find(m => m.userId === myUserId)) {
        updateData.isAlreadyMember = true;
      }

      // 碰面地点
      if (meeting.meetPoint && meeting.meetPoint.name) {
        updateData.poiName = meeting.meetPoint.name;
      }

      // 构建参与人头像列表
      const memberAvatarList = meeting.members.map(m => ({
        text: (m.nickname || '?').charAt(0),
        url: m.avatarUrl || ''
      }));
      updateData.memberAvatarList = memberAvatarList;

      // 计算 timeAgo
      if (meeting.members && meeting.members.length > 0) {
        const firstMember = meeting.members.find(m => m.isCreator) || meeting.members[0];
        const joinTime = firstMember.lastUpdate || 0;
        if (joinTime > 0) {
          updateData.timeAgo = this._calcTimeAgo(joinTime);
        }
      }

      this.setData(updateData);
    } catch (e) {
      console.warn('获取碰头信息失败:', e);
    }
  },

  _calcTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚发起';
    if (minutes < 60) return minutes + '分钟前发起';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前发起';
    return Math.floor(hours / 24) + '天前发起';
  },

  // ========== 未授权按钮交互 ==========

  // 【未授权 - 无头像】点加入碰头按钮 → 触发微信 chooseAvatar
  onJoinChooseAvatar(e) {
    const url = e && e.detail && e.detail.avatarUrl;
    if (!url) return;
    this.setData({ avatarUrl: url });
    app.saveUserInfo({ avatarUrl: url });
    // 选完头像后，立刻聚焦昵称输入框
    if (!this.data.nickname) {
      setTimeout(() => {
        this.setData({ nicknameFocus: true });
      }, 100);
      wx.showToast({ title: '输入昵称后自动加入', icon: 'none', duration: 2000 });
    } else {
      // 已有昵称（罕见情况）→ 直接走加入
      this._doJoin();
    }
  },

  // 【未授权 - 有头像无昵称】点按钮自动聚焦昵称
  onJoinNeedNickname() {
    this.setData({ nicknameFocus: false });
    setTimeout(() => {
      this.setData({ nicknameFocus: true });
    }, 50);
    wx.showToast({ title: '请输入昵称', icon: 'none' });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e) {
    const name = (e.detail.value || '').trim();
    this.setData({ nicknameFocus: false });
    if (name) {
      this.setData({ nickname: name, hasProfile: true });
      app.saveUserInfo({ nickname: name });
      // 如果已经有头像 & 不是已加入成员 → 自动执行加入碰头
      if (this.data.avatarUrl && !this.data.isAlreadyMember && !this.data.loading) {
        this._doJoin();
      }
    }
  },

  // 【已授权】点加入碰头
  async onJoin() {
    this._doJoin();
  },

  // 真正执行加入
  async _doJoin() {
    const info = app.globalData.userInfo;
    if (!info || !info.nickname) {
      wx.showToast({ title: '请先设置昵称哦', icon: 'none' });
      return;
    }

    if (this.data.hasConflict && app.globalData.activeMeetingId) {
      app.setActiveMeeting(null);
    }

    this.setData({ loading: true });
    try {
      const result = await meetingManager.joinMeeting(this.data.meetingId, info);
      if (result && result.ok) {
        app.setActiveMeeting(this.data.meetingId);
        this.setData({ loading: false });
        wx.showToast({ title: '加入成功', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/map/map?id=' + this.data.meetingId + '&role=member'
          });
        }, 1500);
      } else {
        wx.showToast({ title: (result && result.msg) || '加入失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('加入碰头失败:', e);
      wx.showToast({ title: '加入失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onEnterMeeting() {
    wx.redirectTo({
      url: '/pages/map/map?id=' + this.data.meetingId + '&role=member'
    });
  },

  // 返回首页（处理分享进来没有返回栈的情况）
  onBackHome() {
    // 优先尝试走 navigateBack（如果有返回栈）
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      // 没有返回栈（从分享/扫码进来）→ 重定向到首页
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  onShareAppMessage() {
    const info = app.globalData.userInfo || {};
    const userName = info.nickname || '好友';
    return {
      title: userName + '邀请你一起碰面！',
      path: '/pages/join/join?id=' + this.data.meetingId
    };
  }
});
