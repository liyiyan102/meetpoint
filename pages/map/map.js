const app = getApp();
const meetingMgr = require('../../utils/meeting');
const mapService = require('../../utils/map');
const algo = require('../../utils/algorithm');

const DEFAULT_AVATAR = '/images/avatar-default@2x.png';

Page({
  data: {
    statusBarHeight: 20,
    // 胶囊按钮定位信息（用于工具条和状态栏对齐）
    capsuleTop: 0,      // 胶囊 top (px)
    capsuleHeight: 32,   // 胶囊高度 (px)
    capsuleRight: 10,    // 胶囊距右 (px)
    capsuleWidth: 87,    // 胶囊宽度 (px)
    toolbarTop: 0,       // 工具条 top = capsuleTop + capsuleHeight + 12 (px)

    // 地图设置 — 指南针偏移，避免被工具条遮挡
    mapSetting: {},

    meetingId: '',
    role: 'creator', // creator | member
    userId: '',
    meeting: null,
    memberCount: 0,
    mapCenter: { latitude: 39.9042, longitude: 116.4074 },
    mapScale: 14,
    markers: [],
    polylines: [],
    meetPoint: null,
    defaultAvatar: DEFAULT_AVATAR,
    selectedMarkerId: null,
    tapPointMarker: null, // 图面点击选中时的临时蓝色 Pin marker

    // 面板状态
    showAddFriend: false,
    showRecommend: false,
    showUserPanel: false,
    showPlacePanel: false,
    // 面板折叠态
    addFriendCollapsed: false,
    userPanelCollapsed: false,
    placePanelCollapsed: false,
    // 添加好友面板内「手动添加好友位置」的展开状态
    manualAddExpanded: false,

    // 添加好友
    searchKeyword: '',
    searchResults: [],
    pickedLocation: null,
    friendName: '',
    placeFriendName: '', // 地点面板中的好友名称输入

    // 碰头地点推荐
    placeTypes: mapService.PLACE_TYPES.map(function(t) { return { id: t.id, label: t.label, iconPath: t.icon }; }),
    selectedType: '',
    recommendList: [],
    recommendLoading: false,
    recommendMarkers: [], // 推荐地点在地图上的 marker
    recommendCollapsed: false, // 推荐面板是否收起（只显示标题栏）

    // 用户面板
    panelUser: {},

    // 地点面板
    panelPlace: {},
    routeInfos: [],
    routeMode: 'driving', // driving | walking
    isRouteMock: false, // 是否为模拟路线

    // Toast
    toastText: '',

    // 测试工具
    showTestTool: false,
    testUsers: []
  },

  async onLoad(options) {
    // 等待登录完成
    if (app.globalData.loginReady) {
      await app.globalData.loginReady;
    }

    const sys = wx.getSystemInfoSync();
    // 获取胶囊按钮位置
    const screenWidth = sys.screenWidth || 375;
    const statusBarHeight = sys.statusBarHeight || 20;
    let capsuleTop = statusBarHeight + 6;
    let capsuleHeight = 32;
    let capsuleRight = 7;   // 胶囊右边缘距屏幕右边的距离(px)
    let capsuleWidth = 87;
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      if (rect && rect.top > 0) {
        capsuleTop = rect.top;
        capsuleHeight = rect.height;
        capsuleRight = screenWidth - rect.right; // 右边缘距屏幕右边的距离
        capsuleWidth = rect.width;
      }
    } catch (e) { /* 兼容 */ }
    const toolbarTop = capsuleTop + capsuleHeight + 12;

    // 计算工具条底部位置，指南针需要下移到工具条下方
    const toolboxHeight = 280; // 工具栏4个按钮+分割线的预估高度(px)
    const compassOffsetY = toolbarTop + toolboxHeight;

    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      capsuleTop,
      capsuleHeight,
      capsuleRight,
      capsuleWidth,
      toolbarTop,
      mapSetting: {
        gestureEnable: 1,
        showCompass: 1,
        compassOffset: [capsuleRight + 10, compassOffsetY]
      },
      meetingId: options.id || '',
      role: options.role || 'creator',
      userId: (app.globalData.userInfo && app.globalData.userInfo.userId) || ''
    });
    // 重置「参与智能推荐」缓存（按 meetingId 维度独立）
    this._recommendExcludeCache = null;
    this._mapCtx = null;
    this._locationTimer = null;
    this._refreshTimer = null;
    this._meetingWatcher = null;
    this._markerMap = {};
    this._needsInitialCenter = true;
    // Canvas 合成后的头像 marker 本地路径
    this._myAvatarMarker = '';
    this._myAvatarMarkerSelected = '';
    // 默认头像 marker（手动好友 + 无头像用户共用）
    this._defaultAvatarMarker = '';
    this._defaultAvatarMarkerSelected = '';

    // 合成头像 marker 图标
    this._buildAvatarMarker();
    this._buildDefaultAvatarMarker();

    // 初始获取位置 — 获取到后居中地图
    this._getLocationAndCenter();

    // 启动云数据库实时监听（替代轮询 _refreshTimer）
    this._startWatching();
  },

  onReady() {
    this._mapCtx = wx.createMapContext('mainMap', this);
    // 延迟生成分享封面（等待数据加载）
    setTimeout(() => this._generateShareImage(), 1500);
  },

  onShow() {
    this._refreshMeeting();
    // 每5秒上报位置到云端
    this._locationTimer = setInterval(() => this._getLocation(), 5000);
    // 备用：如果 watch 不可用，仍然轮询刷新
    if (!this._meetingWatcher) {
      this._refreshTimer = setInterval(() => this._refreshMeeting(), 5000);
    }
  },

  onHide() {
    this._clearTimers();
  },

  onUnload() {
    this._clearTimers();
    // 关闭实时监听
    if (this._meetingWatcher) {
      this._meetingWatcher.close();
      this._meetingWatcher = null;
    }
  },

  _clearTimers() {
    if (this._locationTimer) { clearInterval(this._locationTimer); this._locationTimer = null; }
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
  },

  // 启动云数据库实时监听
  _startWatching() {
    const meetingId = this.data.meetingId;
    if (!meetingId) return;
    try {
      this._meetingWatcher = meetingMgr.watchMeeting(meetingId, (meeting) => {
        // 实时数据变化回调 → 刷新地图
        this._refreshMeeting();
      });
      if (this._meetingWatcher) {
        console.log('[map] 已启动碰头实时监听');
      }
    } catch (e) {
      console.warn('[map] 启动实时监听失败，将使用轮询:', e);
    }
  },

  // 合成头像 Marker：在 marker 底图上绘制圆形裁剪头像
  _buildAvatarMarker() {
    const avatarUrl = (app.globalData.userInfo && app.globalData.userInfo.avatarUrl) || '/images/markers/avatar-default@2x.png';
    const self = this;

    // 先获取头像本地路径
    const doComposite = function(localAvatar) {
      // 正常态: 底图 44px，Canvas 用 2x(88) 保证清晰
      self._compositeOne(localAvatar, 88, '/images/markers/marker-me-normal.png', function(path) {
        self._myAvatarMarker = path;
        self._refreshMeeting();
      });
      // 选中态: 底图 56px，Canvas 用 2x(112) 保证清晰
      self._compositeOne(localAvatar, 112, '/images/markers/marker-me-selected.png', function(path) {
        self._myAvatarMarkerSelected = path;
        self._refreshMeeting();
      });
    };

    // 如果是本地路径或包内路径直接用，网络URL先下载
    if (avatarUrl.indexOf('wxfile://') === 0 || avatarUrl.indexOf('http://tmp/') === 0 || avatarUrl.indexOf('/') === 0) {
      doComposite(avatarUrl);
    } else if (avatarUrl.indexOf('http') === 0) {
      wx.downloadFile({
        url: avatarUrl,
        success: function(res) {
          if (res.statusCode === 200 && res.tempFilePath) {
            doComposite(res.tempFilePath);
          } else {
            // 下载失败用默认头像
            doComposite('/images/markers/avatar-default@2x.png');
          }
        },
        fail: function() {
          console.warn('头像下载失败，使用默认头像');
          doComposite('/images/markers/avatar-default@2x.png');
        }
      });
    } else {
      doComposite('/images/markers/avatar-default@2x.png');
    }
  },

  // 合成默认头像 Marker（按类型区分边框颜色）
  _buildDefaultAvatarMarker() {
    var self = this;
    var defaultAvatarPath = '/images/markers/avatar-default@2x.png';

    // 默认灰色（手动好友 + 离线无头像）
    this._defaultAvatarMarker = '';
    this._defaultAvatarMarkerSelected = '';
    // 蓝色（自己无头像）
    this._selfDefaultMarker = '';
    this._selfDefaultMarkerSelected = '';
    // 绿色（在线好友无头像）
    this._onlineDefaultMarker = '';
    this._onlineDefaultMarkerSelected = '';

    function buildWithBorder(size, color, callback) {
      var canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size });
      var ctx = canvas.getContext('2d');
      var cx = size / 2;
      var cy = size / 2;
      var outerR = size / 2 - 1;
      var borderW = size * 0.07;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, outerR - borderW, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      wx.canvasToTempFilePath({
        canvas: canvas,
        x: 0, y: 0,
        width: size, height: size,
        destWidth: size * 2, destHeight: size * 2,
        success: function(res) {
          self._compositeOne(defaultAvatarPath, size, res.tempFilePath, callback);
        },
        fail: function() { console.warn('生成底图失败'); }
      });
    }

    // 灰色（手动好友/离线）
    buildWithBorder(88, '#BFBFBF', function(p) { self._defaultAvatarMarker = p; self._refreshMeeting(); });
    buildWithBorder(112, '#BFBFBF', function(p) { self._defaultAvatarMarkerSelected = p; self._refreshMeeting(); });
    // 蓝色（自己）
    buildWithBorder(88, '#4A7FE5', function(p) { self._selfDefaultMarker = p; self._refreshMeeting(); });
    buildWithBorder(112, '#4A7FE5', function(p) { self._selfDefaultMarkerSelected = p; self._refreshMeeting(); });
    // 绿色（在线好友）
    buildWithBorder(88, '#2ECC71', function(p) { self._onlineDefaultMarker = p; self._refreshMeeting(); });
    buildWithBorder(112, '#2ECC71', function(p) { self._onlineDefaultMarkerSelected = p; self._refreshMeeting(); });
  },

  // 在 Canvas 上将头像圆形裁剪后叠加到底图上，输出为临时图片
  // addGrayMask: 是否为离线用户添加灰色蒙层
  _compositeOne(avatarLocal, size, bgIconPath, callback, addGrayMask) {
    console.log('[Canvas合成] 开始:', { avatarLocal, size, bgIconPath, addGrayMask });
    var canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size });
    var ctx = canvas.getContext('2d');

    var bgImg = canvas.createImage();
    var avImg = canvas.createImage();
    var loaded = 0;
    var onAllLoaded = function() {
      loaded++;
      console.log('[Canvas合成] 图片加载进度:', loaded, '/2');
      if (loaded < 2) return;

      // 1. 先绘制底图（彩色边框 + 白色实心圆）
      ctx.drawImage(bgImg, 0, 0, size, size);

      // 2. 在底图白色圆心区域内绘制圆形裁剪头像（覆盖白色部分）
      // 底图是一个圆形，中心在 (size/2, size/2)
      var cx = size / 2;
      var cy = size / 2;
      // 头像圆半径略小于底图圆（留出边框宽度）
      var circleR = size * 0.38;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avImg, cx - circleR, cy - circleR, circleR * 2, circleR * 2);
      ctx.restore();

      // 3. 如果是离线用户，叠加灰色半透明圆形蒙层
      if (addGrayMask) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = 'rgba(150, 150, 150, 0.45)';
        ctx.fill();
        ctx.restore();
      }

      // 4. 导出为临时图片
      wx.canvasToTempFilePath({
        canvas: canvas,
        x: 0, y: 0,
        width: size, height: size,
        destWidth: size * 2,
        destHeight: size * 2,
        success: function(res) {
          callback(res.tempFilePath);
        },
        fail: function(err) {
          console.warn('Canvas 导出失败:', err);
        }
      });
    };

    bgImg.onload = onAllLoaded;
    avImg.onload = onAllLoaded;
    bgImg.src = bgIconPath;
    avImg.src = avatarLocal;
  },

  // 稳定生成 Marker ID
  _getNumericId(strId) {
    if (!this._idMap) this._idMap = {};
    if (!this._idCounter) this._idCounter = 1;
    if (this._idMap[strId]) return this._idMap[strId];
    this._idMap[strId] = this._idCounter++;
    return this._idMap[strId];
  },

  // 为好友头像构建 Canvas 合成 marker（带缓存）
  // borderColor: 边框颜色, userId: 缓存key
  _buildFriendAvatarMarker(avatarUrl, borderColor, userId) {
    console.log('[好友头像] 开始构建:', userId, avatarUrl, borderColor);
    if (!this._friendMarkerCache) this._friendMarkerCache = {};
    var cacheKey = userId + '_' + borderColor;
    // 已经构建过或正在构建中则跳过
    if (this._friendMarkerCache[cacheKey] || this._friendMarkerBuilding && this._friendMarkerBuilding[cacheKey]) {
      console.log('[好友头像] 已缓存或构建中，跳过:', cacheKey);
      return;
    }
    if (!this._friendMarkerBuilding) this._friendMarkerBuilding = {};
    this._friendMarkerBuilding[cacheKey] = true;

    // URL 归一化：服务器返回的是相对路径 /uploads/avatars/xxx.png
    // 需要补全为完整公网 URL，否则 Canvas/下载加载不到
    if (avatarUrl && avatarUrl.indexOf('/') === 0 && avatarUrl.indexOf('//') !== 0) {
      if (avatarUrl.indexOf('/api/') === 0) {
        avatarUrl = 'https://meetpoint.top' + avatarUrl;
      } else {
        avatarUrl = 'https://meetpoint.top/api' + avatarUrl;
      }
      console.log('[好友头像] URL 归一化后:', avatarUrl);
    }

    var self = this;
    function doComposite(localAvatar) {
      console.log('[好友头像] 开始Canvas合成:', localAvatar);
      // 生成彩色边框底图
      function buildBorder(size, cb) {
        var canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size });
        var ctx = canvas.getContext('2d');
        var cx = size / 2, cy = size / 2;
        var outerR = size / 2 - 1;
        var borderW = size * 0.07;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
        ctx.fillStyle = borderColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, outerR - borderW, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        wx.canvasToTempFilePath({
          canvas: canvas, x: 0, y: 0, width: size, height: size,
          destWidth: size * 2, destHeight: size * 2,
          success: function(res) { cb(res.tempFilePath); },
          fail: function() { console.warn('好友底图生成失败'); }
        });
      }
      // 正常态 88px
      buildBorder(88, function(bgPath) {
        console.log('[好友头像] 底图生成成功(88px):', bgPath);
        self._compositeOne(localAvatar, 88, bgPath, function(path) {
          console.log('[好友头像] 合成成功(normal):', path);
          if (!self._friendMarkerCache[cacheKey]) self._friendMarkerCache[cacheKey] = {};
          self._friendMarkerCache[cacheKey].normal = path;
          self._refreshMeeting();
        });
      });
      // 选中态 112px
      buildBorder(112, function(bgPath) {
        console.log('[好友头像] 底图生成成功(112px):', bgPath);
        self._compositeOne(localAvatar, 112, bgPath, function(path) {
          console.log('[好友头像] 合成成功(selected):', path);
          if (!self._friendMarkerCache[cacheKey]) self._friendMarkerCache[cacheKey] = {};
          self._friendMarkerCache[cacheKey].selected = path;
          self._refreshMeeting();
        });
      });
    }

    // 下载网络头像
    if (avatarUrl.indexOf('wxfile://') === 0 || avatarUrl.indexOf('http://tmp/') === 0) {
      console.log('[好友头像] 本地临时文件，直接合成:', avatarUrl);
      doComposite(avatarUrl);
    } else if (avatarUrl.indexOf('http') === 0) {
      console.log('[好友头像] 网络图片，开始下载:', avatarUrl);
      wx.downloadFile({
        url: avatarUrl,
        success: function(res) {
          console.log('[好友头像] 下载成功:', res.statusCode, res.tempFilePath);
          if (res.statusCode === 200 && res.tempFilePath) {
            doComposite(res.tempFilePath);
          } else {
            console.warn('[好友头像] 下载状态码异常:', res.statusCode);
          }
        },
        fail: function(err) { 
          console.error('[好友头像] 下载失败:', userId, avatarUrl, err); 
        }
      });
    } else {
      console.warn('[好友头像] 不支持的URL格式:', avatarUrl);
    }
  },

  // ========== 位置 ==========

  // 初始获取位置并居中到用户当前位置
  _getLocationAndCenter() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 更新到碰头数据
        meetingMgr.updateLocation(
          this.data.meetingId, this.data.userId, res.latitude, res.longitude
        );
        // 首次定位成功 → 居中到用户位置
        if (this._needsInitialCenter) {
          this._needsInitialCenter = false;
          this.setData({
            mapCenter: { latitude: res.latitude, longitude: res.longitude }
          });
        }
        this._refreshMeeting();
      },
      fail: (err) => {
        console.warn('初始定位失败:', err);
        // 定位失败也刷新一次会议数据（可能有其他成员位置）
        this._refreshMeeting();
      }
    });
  },

  // 将地图视野调整为包含所有成员和碰头地点
  _fitAllMembers() {
    const meeting = this.data.meeting;
    if (!meeting || !this._mapCtx) return;
    const allPoints = meetingMgr.getAllLocationPoints(meeting);
    if (meeting.meetPoint && meeting.meetPoint.latitude) {
      allPoints.push({ latitude: meeting.meetPoint.latitude, longitude: meeting.meetPoint.longitude });
    }
    if (allPoints.length === 0) return;
    if (allPoints.length === 1) {
      this.setData({ mapCenter: { latitude: allPoints[0].latitude, longitude: allPoints[0].longitude } });
      return;
    }
    this._mapCtx.includePoints({
      points: allPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
      padding: [120, 60, 120, 60]
    });
  },

  // 后续静默更新位置（不改变地图中心，避免用户拖动被打断）
  _getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        meetingMgr.updateLocation(
          this.data.meetingId, this.data.userId, res.latitude, res.longitude
        );
      },
      fail: () => {} // 静默失败，下次继续尝试
    });
  },

  // ========== 刷新数据 & 渲染 ==========

  // 在线判定阈值：30秒内有更新则视为在线
  _isOnline(lastUpdate) {
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate) < 30000;
  },

  // Marker 图标路径映射（交接文档 §3.B）
  _getIconPath(type, isSelected) {
    const state = isSelected ? 'selected' : 'normal';
    const iconMap = {
      'me': 'marker-me',
      'friend_online': 'marker-online',
      'friend_offline': 'marker-offline',
      'manual_add': 'marker-manual',
      'confirmed_poi': 'marker-confirmed',
      'recommend_poi': 'marker-recommend'
    };
    return '/images/markers/' + iconMap[type] + '-' + state + '.png';
  },

  // Marker callout 文字色映射（交接文档 §3.B）
  _getLabelColor(type) {
    var colorMap = {
      'me': '#4A7FE5',
      'friend_online': '#10B981',
      'friend_offline': '#9CA3AF',
      'manual_add': '#9CA3AF',
      'confirmed_poi': '#EF4444',
      'recommend_poi': '#F59E0B'
    };
    return colorMap[type] || '#181818';
  },

  _refreshMeeting() {
    const meeting = meetingMgr.getMeeting(this.data.meetingId);
    if (!meeting) return;

    const markers = [];
    const selfId = this.data.userId;
    const selectedId = this.data.selectedMarkerId;

    // 诊断日志：打印每个成员的 avatarUrl 和位置状态
    try {
      console.log('[地图成员诊断] 共', (meeting.members || []).length, '位成员');
      (meeting.members || []).forEach((m) => {
        console.log('  -', m.nickname || '(无昵称)', {
          userId: m.userId,
          isSelf: m.userId === selfId,
          hasLocation: !!(m.latitude && m.longitude),
          avatarUrl: m.avatarUrl || '(空)',
        });
      });
    } catch (e) {}

    // --- 成员 marker：我的位置 / 在线好友 / 离线好友 ---
    meeting.members.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      const isSelf = (m.userId === selfId);
      const online = this._isOnline(m.lastUpdate);
      const markerId = this._getNumericId('member_' + m.userId);
      const isSelected = (markerId === selectedId);
      const type = isSelf ? 'me' : (online ? 'friend_online' : 'friend_offline');

      // 我的位置：优先用 Canvas 合成的头像 marker（蓝圈+圆形头像）
      var iconPath;
      if (isSelf) {
        if (isSelected && this._myAvatarMarkerSelected) {
          iconPath = this._myAvatarMarkerSelected;
        } else if (!isSelected && this._myAvatarMarker) {
          iconPath = this._myAvatarMarker;
        } else if (!m.avatarUrl || m.avatarUrl === '/images/markers/avatar-default@2x.png') {
          // 自己没头像 → 蓝色边框默认头像
          iconPath = isSelected ? (this._selfDefaultMarkerSelected || this._getIconPath(type, isSelected)) : (this._selfDefaultMarker || this._getIconPath(type, isSelected));
        } else {
          iconPath = this._getIconPath(type, isSelected);
        }
      } else {
        // 其他好友：根据在线状态选择边框颜色
        var borderColor = online ? '#2ECC71' : '#BFBFBF';
        if (!m.avatarUrl || m.avatarUrl === '/images/markers/avatar-default@2x.png') {
          if (online) {
            iconPath = isSelected ? (this._onlineDefaultMarkerSelected || this._getIconPath(type, isSelected)) : (this._onlineDefaultMarker || this._getIconPath(type, isSelected));
          } else {
            iconPath = isSelected ? (this._defaultAvatarMarkerSelected || this._getIconPath(type, isSelected)) : (this._defaultAvatarMarker || this._getIconPath(type, isSelected));
          }
        } else {
          // 有头像的好友：使用 Canvas 合成头像 marker
          var cacheKey = m.userId + '_' + borderColor;
          var cached = this._friendMarkerCache && this._friendMarkerCache[cacheKey];
          if (cached && isSelected && cached.selected) {
            iconPath = cached.selected;
          } else if (cached && !isSelected && cached.normal) {
            iconPath = cached.normal;
          } else {
            // 尚未合成完成，先用默认图标，触发异步构建
            iconPath = online
              ? (isSelected ? (this._onlineDefaultMarkerSelected || this._getIconPath(type, isSelected)) : (this._onlineDefaultMarker || this._getIconPath(type, isSelected)))
              : (isSelected ? (this._defaultAvatarMarkerSelected || this._getIconPath(type, isSelected)) : (this._defaultAvatarMarker || this._getIconPath(type, isSelected)));
            this._buildFriendAvatarMarker(m.avatarUrl, borderColor, m.userId);
          }
        }
      }

      markers.push({
        id: markerId,
        latitude: m.latitude,
        longitude: m.longitude,
        width: isSelected ? 56 : 44,
        height: isSelected ? 56 : 44,
        iconPath: iconPath,
        callout: {
          content: m.nickname,
          color: this._getLabelColor(type),
          fontSize: isSelected ? 13 : 11,
          bgColor: '#FFFFFF',
          padding: 4,
          borderRadius: 4,
          display: 'ALWAYS'
        },
        _type: 'member',
        _data: Object.assign({}, m, { _online: online, _isSelf: isSelf })
      });
    });

    // --- 手动好友 marker ---
    meeting.manualFriends.forEach((f) => {
      const markerId = this._getNumericId('manual_' + f.id);
      const isSelected = (markerId === selectedId);

      // 使用合成的默认头像 marker，fallback 到 marker-manual 切图
      var iconPath;
      if (isSelected && this._defaultAvatarMarkerSelected) {
        iconPath = this._defaultAvatarMarkerSelected;
      } else if (!isSelected && this._defaultAvatarMarker) {
        iconPath = this._defaultAvatarMarker;
      } else {
        iconPath = this._getIconPath('manual_add', isSelected);
      }

      markers.push({
        id: markerId,
        latitude: f.latitude,
        longitude: f.longitude,
        width: isSelected ? 56 : 44,
        height: isSelected ? 56 : 44,
        iconPath: iconPath,
        callout: {
          content: f.name,
          color: this._getLabelColor('manual_add'),
          fontSize: isSelected ? 13 : 11,
          bgColor: '#FFFFFF',
          padding: 4,
          borderRadius: 4,
          display: 'ALWAYS'
        },
        _type: 'manual',
        _data: f
      });
    });

    // --- 碰头地点 marker ---
    if (meeting.meetPoint) {
        const markerId = this._getNumericId('meetpoint');
        const isSelected = (markerId === selectedId);
        markers.push({
          id: markerId,
          latitude: meeting.meetPoint.latitude,
          longitude: meeting.meetPoint.longitude,
          width: isSelected ? 48 : 36,
          height: isSelected ? 48 : 36,
          iconPath: this._getIconPath('confirmed_poi', isSelected),
          callout: {
            content: meeting.meetPoint.name,
            color: this._getLabelColor('confirmed_poi'),
            fontSize: isSelected ? 13 : 11,
            bgColor: '#FFFFFF',
            padding: 4,
            borderRadius: 4,
            display: 'ALWAYS'
          },
        _type: 'meetpoint',
        _data: meeting.meetPoint
      });
    }

    // 保存marker元数据映射
    this._markerMap = {};
    markers.forEach(m => { this._markerMap[m.id] = { type: m._type, data: m._data }; });

    // 合并推荐地点 markers（动态更新选中态）
    const recMarkers = (this.data.recommendMarkers || []).map(m => {
      const isSelected = (m.id === selectedId);
      return Object.assign({}, m, {
        width: isSelected ? 48 : 36,
        height: isSelected ? 48 : 36,
        iconPath: this._getIconPath('recommend_poi', isSelected)
      });
    });
    recMarkers.forEach(m => { this._markerMap[m.id] = { type: m._type, data: m._data }; });
    var allMarkers = markers.concat(recMarkers);

    // 合并图面点击选中的临时 Pin marker
    const tapMarker = this.data.tapPointMarker;
    if (tapMarker) {
      allMarkers = allMarkers.concat([tapMarker]);
    }

    this.setData({
      meeting,
      memberCount: meeting.members.length + meeting.manualFriends.length,
      markers: allMarkers,
      meetPoint: meeting.meetPoint
    });
  },

  // ========== 顶部 ==========

  onBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) });
  },

  onRelocate() {
    const meeting = this.data.meeting;
    if (!meeting || !this._mapCtx) {
      if (this._mapCtx) this._mapCtx.moveToLocation();
      return;
    }

    // 收集所有应该可见的点：在线用户、自己、手动好友、碰面地点、选中的地点/用户
    var points = [];
    var selfId = this.data.userId;

    // 成员：自己 + 在线好友（有坐标的）
    (meeting.members || []).forEach(m => {
      if (!m.latitude || !m.longitude) return;
      var isSelf = m.userId === selfId;
      var online = this._isOnline(m.lastUpdate);
      if (isSelf || online) {
        points.push({ latitude: m.latitude, longitude: m.longitude });
      }
    });

    // 手动添加的好友
    (meeting.manualFriends || []).forEach(f => {
      if (f.latitude && f.longitude) {
        points.push({ latitude: f.latitude, longitude: f.longitude });
      }
    });

    // 确定的碰面地点
    if (meeting.meetPoint && meeting.meetPoint.latitude && meeting.meetPoint.longitude) {
      points.push({ latitude: meeting.meetPoint.latitude, longitude: meeting.meetPoint.longitude });
    }

    // 当前选中的地点/用户（tapPointMarker）
    var tap = this.data.tapPointMarker;
    if (tap && tap.latitude && tap.longitude) {
      points.push({ latitude: tap.latitude, longitude: tap.longitude });
    }

    if (points.length === 0) {
      this._mapCtx.moveToLocation();
      return;
    }
    if (points.length === 1) {
      this.setData({ mapCenter: { latitude: points[0].latitude, longitude: points[0].longitude }, mapScale: 16 });
      return;
    }

    this._mapCtx.includePoints({
      points: points,
      padding: [120, 60, 120, 60]
    });
  },

  // ========== Marker 点击 ==========

  onMarkerTap(e) {
    const markerId = e.detail.markerId || e.markerId;
    const meta = this._markerMap && this._markerMap[markerId];
    if (!meta) return;

    this.setData({ selectedMarkerId: markerId });

    if (meta.type === 'member') {
      this._refreshMeeting();
      this._showUserPanel(meta.data, false);
    } else if (meta.type === 'manual') {
      this._refreshMeeting();
      this._showUserPanel(meta.data, true);
    } else if (meta.type === 'meetpoint') {
      this._refreshMeeting();
      this._showPlacePanel(meta.data, true);
    } else if (meta.type === 'recommend') {
      // 推荐 marker 点击：用蓝色选中 marker，保留推荐 markers
      this._placePanelFromRecommend = true; // 标记来源，关闭面板时恢复推荐面板
      const place = meta.data;
      if (place.id && place.id.indexOf('mock_') !== 0) {
        mapService.getPlaceDetail(place.id).then(detail => {
          if (detail) {
            place.tel = detail.tel || place.tel;
            place.rating = detail.rating || place.rating;
            place.photos = (detail.photos && detail.photos.length > 0) ? detail.photos : place.photos;
            place.type = detail.type || place.type;
          }
          this._showPlacePanel(place, false, true);
        });
      } else {
        this._showPlacePanel(place, false, true);
      }
    }
  },

  // 地图空白点击 — 只用于关闭面板 & 选位置（添加好友时）
  onMapTap(e) {
    const lat = e.detail.latitude;
    const lng = e.detail.longitude;
    if (lat === undefined || lat === null || lng === undefined || lng === null) return;

    // 场景1: 添加好友面板打开时 → 选择好友位置
    if (this.data.showAddFriend) {
      mapService.reverseGeocode(lat, lng).then(result => {
        this.setData({
          pickedLocation: {
            latitude: lat,
            longitude: lng,
            name: result.name || '选中位置'
          }
        });
      });
      return;
    }

    // 场景2: 有面板打开时 → 关闭面板
    if (this.data.showPlacePanel || this.data.showUserPanel) {
      this._dismissPanel();
      return;
    }

    // 其他面板打开时不处理
    if (this.data.showRecommend) return;

    // 单击空白处：清除选中态
    this.setData({ selectedMarkerId: null, tapPointMarker: null });
    this._refreshMeeting();
  },

  // 地图长按 — 选择地点（代替原来的单击选点，避免误触）
  onMapLongTap(e) {
    const lat = e.detail.latitude;
    const lng = e.detail.longitude;
    if (lat === undefined || lat === null || lng === undefined || lng === null) return;

    // 有面板打开时不处理
    if (this.data.showAddFriend || this.data.showRecommend || this.data.showUserPanel) return;

    // 长按查询地点信息
    this._queryAndShowPlace(lat, lng);
  },

  // 点击地图原生 POI 标注（商铺、地铁站等气泡图标）
  onPoiTap(e) {
    this.setData({ selectedMarkerId: null, tapPointMarker: null });
    this._refreshMeeting();

    const name = e.detail.name || '';
    const lat = e.detail.latitude;
    const lng = e.detail.longitude;
    if (lat === undefined || lat === null || lng === undefined || lng === null) return;

    // 地点面板打开时 → 关闭面板，清除临时marker
    if (this.data.showPlacePanel) {
      this.setData({
        showPlacePanel: false,
        selectedMarkerId: null,
        tapPointMarker: null,
        polylines: [],
        routeInfos: [],
        isRouteMock: false
      });
      this._refreshMeeting();
      return;
    }

    // 有其他面板打开时不处理
    if (this.data.showAddFriend || this.data.showRecommend || this.data.showUserPanel) return;

    // 直接构建地点信息并展示面板
    this._showToast('查询中...');
    // 搜索这个 POI 的详细信息
    mapService.tapLocationInfo(lat, lng).then(place => {
      this.setData({ toastText: '' });
      if (!place) {
        // 如果搜索不到，用 POI 名称直接构建
        place = {
          id: 'poi_' + Date.now(),
          poiId: '',
          name: name || '选中地点',
          type: '',
          address: '',
          tel: '',
          rating: '',
          photos: [],
          latitude: lat,
          longitude: lng
        };
      } else {
        // 优先使用原生 POI 名称
        if (name) place.name = name;
      }
      if (place.poiId) {
        mapService.getPlaceDetail(place.poiId).then(detail => {
          if (detail) {
            place.tel = detail.tel || place.tel;
            place.rating = detail.rating || place.rating;
            place.photos = (detail.photos && detail.photos.length > 0) ? detail.photos : place.photos;
            place.type = detail.type || place.type;
          }
          this._showPlacePanel(place, false);
        });
      } else {
        this._showPlacePanel(place, false);
      }
    });
  },

  // 查询位置信息并展示地点面板（地图空白点击和 POI 点击共用）
  _queryAndShowPlace(lat, lng) {
    this._showToast('查询中...');
    mapService.tapLocationInfo(lat, lng).then(place => {
      this.setData({ toastText: '' });
      if (!place) return;
      if (place.poiId) {
        mapService.getPlaceDetail(place.poiId).then(detail => {
          if (detail) {
            place.tel = detail.tel || place.tel;
            place.rating = detail.rating || place.rating;
            place.photos = (detail.photos && detail.photos.length > 0) ? detail.photos : place.photos;
            place.type = detail.type || place.type;
          }
          this._showPlacePanel(place, false);
        });
      } else {
        this._showPlacePanel(place, false);
      }
    });
  },

  // ========== 用户面板 ==========

  _showUserPanel(data, isManual) {
    this._closeAllPanels();
    const isSelf = !isManual && (data.userId === this.data.userId);
    const online = !isManual ? this._isOnline(data.lastUpdate || (data._online ? Date.now() : 0)) : false;

    // 计算离线时间
    var offlineTime = '';
    if (!isManual && !online && data.lastUpdate && data.lastUpdate > 0) {
      var diff = Date.now() - data.lastUpdate;
      var mins = Math.floor(diff / 60000);
      if (mins < 1) offlineTime = '刚刚离线';
      else if (mins < 60) offlineTime = mins + '分钟前离线';
      else {
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) offlineTime = hrs + '小时前离线';
        else offlineTime = Math.floor(hrs / 24) + '天前离线';
      }
    }

    const user = {
      id: isManual ? data.id : data.userId,
      name: isManual ? data.name : data.nickname,
      avatarUrl: isManual ? '' : (data.avatarUrl || ''),
      latitude: data.latitude,
      longitude: data.longitude,
      isManual: isManual,
      isSelf: isSelf,
      isOnline: online,
      offlineTime: offlineTime,
      includeInRecommend: this._isIncludedInRecommend(isManual ? data.id : data.userId, isManual),
      locationName: isManual ? (data.address || '') : ''
    };

    this.setData({ showUserPanel: true, userPanelCollapsed: false, panelUser: user });

    // 如果没有位置名称，逆地理编码
    if (!user.locationName && user.latitude && user.longitude) {
      mapService.reverseGeocode(user.latitude, user.longitude).then(r => {
        this.setData({ 'panelUser.locationName': r.name });
      });
    }
  },

  onNavToUser() {
    const u = this.data.panelUser;
    if (!u.latitude) return;
    this._openNavigation(u.latitude, u.longitude, u.name);
  },

  onDeleteManualFriend() {
    const u = this.data.panelUser;
    if (!u.isManual) return;
    meetingMgr.removeManualFriend(this.data.meetingId, u.id);
    this.setData({ showUserPanel: false });
    this._refreshMeeting();
    this._showToast('已删除');
  },

  // ========== 「参与智能推荐」开关（排除某成员的位置参与中心点计算） ==========

  // 当前碰头排除集合的 storage key
  _getRecommendExcludeKey() {
    return 'recommend_exclude_' + (this.data.meetingId || 'default');
  },

  // 读取排除集合 { 'userId|manualId': true, ... }
  _getRecommendExcludeSet() {
    if (this._recommendExcludeCache) return this._recommendExcludeCache;
    try {
      var saved = wx.getStorageSync(this._getRecommendExcludeKey());
      this._recommendExcludeCache = (saved && typeof saved === 'object') ? saved : {};
    } catch (e) {
      this._recommendExcludeCache = {};
    }
    return this._recommendExcludeCache;
  },

  // 持久化排除集合
  _saveRecommendExcludeSet() {
    try {
      wx.setStorageSync(this._getRecommendExcludeKey(), this._recommendExcludeCache || {});
    } catch (e) { /* ignore */ }
  },

  // 判断某个成员是否参与推荐计算（默认 true）
  _isIncludedInRecommend(memberId, isManual) {
    if (!memberId) return true;
    var key = (isManual ? 'manual:' : 'user:') + memberId;
    var set = this._getRecommendExcludeSet();
    return !set[key];
  },

  // 用户面板「参与智能推荐」开关切换
  onTogglePanelUserRecommend() {
    var user = this.data.panelUser;
    if (!user || !user.id) return;
    var key = (user.isManual ? 'manual:' : 'user:') + user.id;
    var set = this._getRecommendExcludeSet();
    var nextIncluded;
    if (set[key]) {
      delete set[key];
      nextIncluded = true;
    } else {
      set[key] = true;
      nextIncluded = false;
    }
    this._recommendExcludeCache = set;
    this._saveRecommendExcludeSet();
    this.setData({ 'panelUser.includeInRecommend': nextIncluded });
    this._showToast(nextIncluded ? '已加入智能推荐' : '已忽略 TA 的位置');
  },

  // ========== 地点面板 ==========

  _showPlacePanel(place, isMeetPoint, isFromRecommend) {
    // 关闭其他面板，但推荐点击时保留 recommendMarkers
    if (isFromRecommend) {
      this.setData({
        showAddFriend: false,
        showRecommend: false,
        showUserPanel: false,
        showPlacePanel: false,
        showTestTool: false,
        polylines: [],
        routeInfos: [],
        isRouteMock: false,
        tapPointMarker: null
      });
    } else {
      this._closeAllPanels();
    }

    const p = Object.assign({}, place, { isMeetPoint: isMeetPoint });

    // 非碰面点时放置蓝色选中 Pin marker
    var tapMarker = null;
    if (!isMeetPoint && p.latitude && p.longitude) {
      tapMarker = {
        id: 999,
        latitude: p.latitude,
        longitude: p.longitude,
        width: 48,
        height: 48,
        iconPath: '/images/markers/marker-poi-selected.png',
        callout: {
          content: p.name || '选中地点',
          color: '#4A7FE5',
          fontSize: 13,
          bgColor: '#FFFFFF',
          padding: 6,
          borderRadius: 4,
          display: 'ALWAYS'
        }
      };
    }

    this.setData({
      tapPointMarker: tapMarker
    });
    // 刷新 markers
    this._refreshMeeting();

    this.setData({
      showPlacePanel: true,
      panelPlace: p,
      routeInfos: [],
      placeFriendName: ''
    });

    // 计算各成员到此地点的路线
    this._calculateRoutes(p);
  },

  _calculateRoutes(place, mode) {
    const meeting = this.data.meeting;
    if (!meeting) return;
    const points = meetingMgr.getAllLocationPoints(meeting);
    if (points.length === 0) return;

    const routeMode = mode || this.data.routeMode || 'driving';
    const routeFn = routeMode === 'walking' ? mapService.walkingRoute : mapService.drivingRoute;
    const to = { latitude: place.latitude, longitude: place.longitude };
    const self = this;

    // 串行请求路线，每次间隔 300ms，避免触发腾讯地图 API 并发限流
    var infos = [];
    var index = 0;

    function requestNext() {
      if (index >= points.length) {
        // 全部完成，渲染路线
        var polylines = infos.map(function(info) {
          return {
            points: info.polyline,
            color: info.isSelf ? '#4A7FE5' : '#9CB8E5',  // 自己：蓝色；其他人：浅蓝色
            width: info.isSelf ? (routeMode === 'walking' ? 5 : 6) : 4,
            arrowLine: info.isSelf,
            dottedLine: !info.isSelf, // 自己：连续实线；其他人：虚线
            lineDashPattern: info.isSelf ? [0, 0] : [20, 20] // 增加虚线段长度与间距，避免过于密集
          };
        });
        var isRouteMock = infos.length > 0 && infos[0].isMock;
        self.setData({
          routeInfos: infos,
          polylines: polylines,
          routeMode: routeMode,
          isRouteMock: isRouteMock
        });
        return;
      }

      var pt = points[index];
      var isSelf = pt.id === self.data.userId;
      routeFn(
        { latitude: pt.latitude, longitude: pt.longitude }, to
      ).then(function(route) {
        infos.push({
          name: pt.name + (pt.isManual ? '(手动)' : ''),
          isSelf: isSelf,
          distance: route.distance,
          duration: route.duration,
          distanceText: route.distanceText,
          durationText: route.durationText,
          polyline: route.polyline,
          mode: route.mode || routeMode,
          isMock: route.isMock || false
        });
        index++;
        if (index < points.length) {
          setTimeout(requestNext, 1200);
        } else {
          requestNext();
        }
      }).catch(function(err) {
        console.warn('路线请求失败:', pt.name, err);
        index++;
        if (index < points.length) {
          setTimeout(requestNext, 1200);
        } else {
          requestNext();
        }
      });
    }

    requestNext();
  },

  // 手动查看路线
  onViewRoutes() {
    const place = this.data.panelPlace;
    if (place && place.latitude) {
      this._calculateRoutes(place);
    }
  },

  // 切换路线模式（驾车/步行）
  onSwitchRouteMode() {
    const newMode = this.data.routeMode === 'driving' ? 'walking' : 'driving';
    const place = this.data.panelPlace;
    if (place && place.latitude) {
      this._calculateRoutes(place, newMode);
    }
  },

  onNavToPlace() {
    const p = this.data.panelPlace;
    if (!p.latitude) return;
    this._openNavigation(p.latitude, p.longitude, p.name);
  },

  onCallPlace() {
    const tel = this.data.panelPlace.tel;
    if (tel) {
      wx.makePhoneCall({ phoneNumber: tel });
    }
  },

  onSetMeetPoint() {
    const p = this.data.panelPlace;
    meetingMgr.setMeetPoint(this.data.meetingId, p);
    this.setData({ showPlacePanel: false, polylines: [], tapPointMarker: null });
    this._refreshMeeting();
    this._fitAllMembers();
    this._showToast('已设置碰头地点');
    this._generateShareImage();
  },

  onRemoveMeetPoint() {
    meetingMgr.removeMeetPoint(this.data.meetingId);
    this.setData({ showPlacePanel: false, polylines: [], routeInfos: [] });
    this._refreshMeeting();
    this._showToast('已删除碰头地点');
  },

  onMeetPointBarTap() {
    const mp = this.data.meetPoint;
    if (!mp) return;
    // 如果有 POI ID 且缺少详情，尝试获取
    if (mp.id && !mp._detailLoaded && mp.id.indexOf('tap_') !== 0 && mp.id.indexOf('mp_') !== 0) {
      mapService.getPlaceDetail(mp.id).then(detail => {
        if (detail) {
          mp.tel = detail.tel || mp.tel;
          mp.rating = detail.rating || mp.rating;
          mp.photos = (detail.photos && detail.photos.length > 0) ? detail.photos : mp.photos;
          mp.type = detail.type || mp.type;
          mp._detailLoaded = true;
        }
        this._showPlacePanel(mp, true);
      });
    } else {
      this._showPlacePanel(mp, true);
    }
  },

  // ========== 添加好友位置 ==========

  onToggleAddFriend() {
    this._closeAllPanels();
    this.setData({
      showAddFriend: true,
      searchKeyword: '',
      searchResults: [],
      pickedLocation: null,
      friendName: '',
      manualAddExpanded: false  // 默认折叠，主推「邀请好友加入」
    });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearchConfirm() {
    const kw = this.data.searchKeyword.trim();
    if (!kw) {
      this._showToast('请输入搜索关键词');
      return;
    }
    console.log('[Search] 搜索关键词:', kw);
    this._showToast('搜索中...');
    const center = this.data.mapCenter;
    mapService.searchByKeyword(kw, center).then(results => {
      this.setData({ toastText: '' });
      console.log('[Search] 搜索结果数量:', results.length);
      if (results.length === 0) {
        this._showToast('未找到相关地点');
      }
      this.setData({ searchResults: results });
    });
  },

  onPickSearchResult(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.searchResults[idx];
    if (!item) return;
    this.setData({
      pickedLocation: {
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name
      },
      searchResults: []
    });
  },

  onFriendNameInput(e) {
    this.setData({ friendName: e.detail.value });
  },

  onConfirmAddFriend() {
    const loc = this.data.pickedLocation;
    const name = this.data.friendName.trim();
    if (!name) {
      wx.showToast({ title: '请输入好友名称', icon: 'none' });
      return;
    }
    if (!loc) {
      wx.showToast({ title: '请先选择位置', icon: 'none' });
      return;
    }
    meetingMgr.addManualFriend(this.data.meetingId, {
      name: name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.name
    });
    this.setData({ showAddFriend: false });
    this._refreshMeeting();
    this._fitAllMembers();
    this._showToast('已添加' + name + '的位置');
  },

  // ========== 碰头地点推荐 ==========

  // 处理地点类型显示：美食类只显示最后一级，非美食类不显示
  _formatPlaceType(type, selectedTypeId) {
    if (!type) return '';
    // 如果是美食类搜索结果
    if (selectedTypeId === 'food') {
      // 美食类：只取最后一级，如"美食:北京菜"→"北京菜"
      const parts = type.split(':');
      return parts[parts.length - 1];
    }
    // 非美食类：不显示品类
    return '';
  },

  onToggleRecommend() {
    this._closeAllPanels();
    this.setData({
      showRecommend: true,
      selectedType: '',
      recommendList: [],
      recommendLoading: false,
      recommendMarkers: [],
      recommendCollapsed: false
    });
  },

  // 切换推荐面板折叠/展开
  onToggleRecommendCollapse() {
    this.setData({ recommendCollapsed: !this.data.recommendCollapsed });
  },

  // 展开推荐面板
  onExpandRecommend() {
    this.setData({ recommendCollapsed: false });
  },

  // 关闭推荐面板
  onCloseRecommend() {
    this.setData({
      showRecommend: false,
      recommendCollapsed: false,
      recommendMarkers: []
    });
    this._refreshMeeting();
  },

  // 推荐面板触摸结束：下滑→折叠，上滑→展开
  onRecommendTouchEnd(e) {
    if (!this._panelTouchStartY) return;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - this._panelTouchStartY;
    this._panelTouchStartY = 0;
    if (diff > 60) {
      // 下滑 → 折叠
      if (!this.data.recommendCollapsed) {
        this.setData({ recommendCollapsed: true });
      }
    } else if (diff < -60) {
      // 上滑 → 展开
      if (this.data.recommendCollapsed) {
        this.setData({ recommendCollapsed: false });
      }
    }
  },

  onSelectType(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedType: id, recommendLoading: true, recommendList: [], recommendMarkers: [] });

    // 计算中心
    const meeting = this.data.meeting;
    if (!meeting) return;
    const points = meetingMgr.getAllLocationPoints(meeting);
    if (points.length === 0) {
      this.setData({ recommendLoading: false });
      wx.showToast({ title: '暂无位置数据', icon: 'none' });
      return;
    }

    // 过滤掉用户主动设置「不参与智能推荐」的成员
    const that = this;
    const filteredPoints = points.filter(function(p) {
      return that._isIncludedInRecommend(p.id, p.isManual);
    });

    // 兜底：所有人都被排除时，回退用全员（避免空集导致无中心点）
    var pointsForCenter = filteredPoints.length > 0 ? filteredPoints : points;
    if (filteredPoints.length === 0 && points.length > 0) {
      this._showToast('当前所有成员都未参与推荐，已使用全部位置');
    } else if (filteredPoints.length < points.length) {
      var excludedCount = points.length - filteredPoints.length;
      this._showToast('已忽略 ' + excludedCount + ' 位成员的位置');
    }

    const center = algo.calculateCenter(pointsForCenter);
    if (!center) {
      this.setData({ recommendLoading: false });
      return;
    }

    const radius = algo.calculateSearchRadius(center, pointsForCenter);

    mapService.searchPOI(center, id, radius).then(list => {
      // 处理列表中的类型显示
      const formattedList = list.map(place => {
        return Object.assign({}, place, {
          displayType: this._formatPlaceType(place.type, id)
        });
      });

      // 为推荐地点生成地图 markers（ID 从 900 开始避免冲突）
      const selectedId = this.data.selectedMarkerId;
      const self = this;
      const recMarkers = formattedList.map((place, i) => {
        const markerId = 900 + i;
        const isSelected = (markerId === selectedId);
        // callout 中只展示地点名，不加类型前缀
        return {
          id: markerId,
          latitude: place.latitude,
          longitude: place.longitude,
          width: isSelected ? 48 : 36,
          height: isSelected ? 48 : 36,
          iconPath: self._getIconPath('recommend_poi', isSelected),
          callout: {
            content: place.name,
            color: self._getLabelColor('recommend_poi'),
            fontSize: isSelected ? 13 : 11,
            bgColor: '#FFFFFF',
            padding: 4,
            borderRadius: 4,
            display: 'ALWAYS'
          },
          _type: 'recommend',
          _data: place
        };
      });

      this.setData({
        recommendList: formattedList,
        recommendLoading: false,
        recommendMarkers: recMarkers
      });

      // 刷新地图 markers（合并推荐点）
      this._refreshMeeting();

      // 如果有推荐结果，缩放地图以包含所有推荐点
      if (list.length > 0 && this._mapCtx) {
        const includePoints = list.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        // 加上当前中心点
        includePoints.push(center);
        this._mapCtx.includePoints({
          points: includePoints,
          padding: [120, 50, 300, 50] // 上右下左 padding（下方留出面板空间）
        });
      }
    });
  },

  onRecItemTap(e) {
    const idx = e.currentTarget.dataset.index;
    const place = this.data.recommendList[idx];
    if (!place) return;
    this.setData({ showRecommend: false });
    // 有 POI ID 时获取详情丰富信息
    if (place.id && place.id.indexOf('mock_') !== 0) {
      mapService.getPlaceDetail(place.id).then(detail => {
        if (detail) {
          place.tel = detail.tel || place.tel;
          place.rating = detail.rating || place.rating;
          place.photos = (detail.photos && detail.photos.length > 0) ? detail.photos : place.photos;
          place.type = detail.type || place.type;
        }
        this._showPlacePanel(place, false);
      });
    } else {
      this._showPlacePanel(place, false);
    }
  },

  onSetMeetFromList(e) {
    const idx = e.currentTarget.dataset.index;
    const place = this.data.recommendList[idx];
    if (!place) return;
    meetingMgr.setMeetPoint(this.data.meetingId, place);
    this.setData({ showRecommend: false, polylines: [], recommendMarkers: [], tapPointMarker: null });
    this._refreshMeeting();
    this._showToast('已设置碰头地点');
    this._generateShareImage();
  },

  // ========== 面板管理 ==========

  // 地点面板 — 好友名称输入
  onPlaceFriendNameInput(e) {
    this.setData({ placeFriendName: e.detail.value });
  },

  // 地点面板 — 将当前地点设为好友位置
  onSetPlaceAsFriend() {
    const place = this.data.panelPlace;
    const name = (this.data.placeFriendName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入好友名称', icon: 'none' });
      return;
    }
    if (!place || !place.latitude) {
      wx.showToast({ title: '地点信息不完整', icon: 'none' });
      return;
    }
    meetingMgr.addManualFriend(this.data.meetingId, {
      name: name,
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || place.name || ''
    });
    // 关闭面板，清除临时 marker
    this.setData({
      showPlacePanel: false,
      selectedMarkerId: null,
      tapPointMarker: null,
      polylines: [],
      routeInfos: [],
      isRouteMock: false,
      placeFriendName: ''
    });
    this._refreshMeeting();
    this._fitAllMembers();
    this._showToast('已添加 ' + name + ' 的位置');
  },

  onClosePlacePanel() {
    this._dismissPanel();
  },

  onCloseUserPanel() {
    this._dismissPanel();
  },

  // 展开面板（从缩小态恢复）
  onExpandUserPanel() {
    this.setData({ userPanelCollapsed: false });
  },
  onExpandPlacePanel() {
    this.setData({ placePanelCollapsed: false });
  },
  onExpandAddFriend() {
    this.setData({ addFriendCollapsed: false });
  },

  // 切换「手动添加好友位置」展开/折叠
  onToggleManualAdd() {
    this.setData({ manualAddExpanded: !this.data.manualAddExpanded });
  },

  // 面板下滑关闭（用户/地点面板共用）
  _dismissPanel() {
    const fromRecommend = this._placePanelFromRecommend;
    this._placePanelFromRecommend = false;

    this.setData({
      showPlacePanel: false,
      showUserPanel: false,
      placePanelCollapsed: false,
      userPanelCollapsed: false,
      selectedMarkerId: null,
      tapPointMarker: null,
      polylines: [],
      routeInfos: [],
      isRouteMock: false
    });

    // 如果是从推荐 marker 进入的，恢复推荐面板
    if (fromRecommend && (this.data.recommendMarkers || []).length > 0) {
      this.setData({ showRecommend: true });
    }

    this._refreshMeeting();
  },

  // 面板触摸开始记录位置
  onPanelTouchStart(e) {
    this._panelTouchStartY = e.touches[0].clientY;
  },

  // 面板触摸结束：下滑→缩小，上滑→展开
  onPanelTouchEnd(e) {
    if (!this._panelTouchStartY) return;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - this._panelTouchStartY;
    this._panelTouchStartY = 0;
    if (diff > 60) {
      // 下滑 → 折叠
      if (this.data.showUserPanel && !this.data.userPanelCollapsed) {
        this.setData({ userPanelCollapsed: true });
      } else if (this.data.showPlacePanel && !this.data.placePanelCollapsed) {
        this.setData({ placePanelCollapsed: true });
      } else if (this.data.showAddFriend && !this.data.addFriendCollapsed) {
        this.setData({ addFriendCollapsed: true });
      }
    } else if (diff < -60) {
      // 上滑 → 展开
      if (this.data.showUserPanel && this.data.userPanelCollapsed) {
        this.setData({ userPanelCollapsed: false });
      } else if (this.data.showPlacePanel && this.data.placePanelCollapsed) {
        this.setData({ placePanelCollapsed: false });
      } else if (this.data.showAddFriend && this.data.addFriendCollapsed) {
        this.setData({ addFriendCollapsed: false });
      }
    }
  },

  // 阻止面板内滑动事件冒泡到地图
  onPanelPrevent() {
    // 空函数，仅用于 catchtouchmove 阻止事件冒泡
  },

  onClosePanel() {
    this._closeAllPanels();
  },

  _closeAllPanels() {
    const hadRecommend = this.data.showRecommend;
    this.setData({
      showAddFriend: false,
      showRecommend: false,
      showUserPanel: false,
      showPlacePanel: false,
      showTestTool: false,
      addFriendCollapsed: false,
      userPanelCollapsed: false,
      placePanelCollapsed: false,
      polylines: [],
      routeInfos: [],
      isRouteMock: false,
      recommendMarkers: [],
      recommendCollapsed: false,
      selectedMarkerId: null,
      tapPointMarker: null
    });
    // 如果之前有推荐面板打开，需要刷新地图去掉推荐 markers
    if (hadRecommend || this.data.selectedMarkerId) {
      this._refreshMeeting();
    }
  },

  // ========== 导航 ==========

  _openNavigation(lat, lng, name) {
    wx.showActionSheet({
      itemList: ['腾讯地图', '高德地图', '百度地图'],
      success: (res) => {
        const encodedName = encodeURIComponent(name || '目的地');
        if (res.tapIndex === 0) {
          // 腾讯地图：优先 URL Scheme，降级 wx.openLocation
          wx.navigateToMiniProgram({
            appId: 'wx7643d5f831302ab0', // 腾讯地图小程序
            path: 'plugin://routePlan/bindPage?endPoint=' + JSON.stringify({
              name: name || '目的地',
              latitude: lat,
              longitude: lng
            }) + '&mode=driving&themeColor=#4A7FE5',
            fail: () => {
              wx.openLocation({ latitude: lat, longitude: lng, name: name || '目的地', scale: 16 });
            }
          });
        } else if (res.tapIndex === 1) {
          // 高德地图小程序
          wx.navigateToMiniProgram({
            appId: 'wxd930ea5d5a258f4f', // 高德地图小程序
            path: 'pages/search/around/around?center_longitude=' + lng + '&center_latitude=' + lat + '&keywords=' + encodedName,
            fail: () => {
              wx.openLocation({ latitude: lat, longitude: lng, name: name || '目的地', scale: 16 });
            }
          });
        } else if (res.tapIndex === 2) {
          // 百度地图小程序
          wx.navigateToMiniProgram({
            appId: 'wx0cb6082ef643d7f4', // 百度地图小程序
            path: 'pages/index/index?coord_type=gcj02&destination=' + encodedName + '&dest_latitude=' + lat + '&dest_longitude=' + lng + '&mode=driving',
            fail: () => {
              wx.openLocation({ latitude: lat, longitude: lng, name: name || '目的地', scale: 16 });
            }
          });
        }
      }
    });
  },

  // ========== 测试工具 ==========

  // 长按成员数触发测试工具
  onToggleTestTool() {
    this._closeAllPanels();
    // 预设的模拟用户列表（不同城市常见位置）
    const center = this.data.mapCenter;
    const testUsers = [
      { id: 'test_1', name: '张三', emoji: '😀', lat: center.latitude + 0.008, lng: center.longitude + 0.005, added: false },
      { id: 'test_2', name: '李四', emoji: '😎', lat: center.latitude - 0.006, lng: center.longitude + 0.008, added: false },
      { id: 'test_3', name: '王五', emoji: '🤠', lat: center.latitude + 0.004, lng: center.longitude - 0.007, added: false },
      { id: 'test_4', name: '赵六', emoji: '🧐', lat: center.latitude - 0.009, lng: center.longitude - 0.004, added: false },
      { id: 'test_5', name: '小明', emoji: '🤩', lat: center.latitude + 0.012, lng: center.longitude + 0.002, added: false },
      { id: 'test_6', name: '小红', emoji: '😊', lat: center.latitude - 0.003, lng: center.longitude + 0.011, added: false }
    ];
    // 标记已加入的
    const meeting = this.data.meeting;
    if (meeting) {
      testUsers.forEach(u => {
        const exists = meeting.members.find(m => m.userId === u.id) ||
                       meeting.manualFriends.find(f => f.name === u.name);
        if (exists) u.added = true;
      });
    }
    this.setData({ showTestTool: true, testUsers });
  },

  onToggleTestUser(e) {
    const idx = e.currentTarget.dataset.index;
    const user = this.data.testUsers[idx];
    if (!user) return;
    if (user.added) {
      this.onRemoveTestUser(e);
    } else {
      this.onAddTestUser(e);
    }
  },

  onAddTestUser(e) {
    const idx = e.currentTarget.dataset.index;
    const user = this.data.testUsers[idx];
    if (!user || user.added) return;

    const meeting = meetingMgr.getMeeting(this.data.meetingId);
    if (!meeting) return;

    // 作为"真实成员"加入（模拟其他设备扫码加入）
    const testMember = {
      userId: user.id,
      nickname: user.name,
      avatarUrl: '',
      latitude: user.lat,
      longitude: user.lng,
      lastUpdate: Date.now(),
      isCreator: false,
      isManual: false
    };

    // 检查是否已存在
    if (!meeting.members.find(m => m.userId === user.id)) {
      meeting.members.push(testMember);
      // 直接保存到 storage
      try {
        const all = wx.getStorageSync('meetings') || {};
        all[meeting.id] = meeting;
        wx.setStorageSync('meetings', all);
      } catch (e) { console.error('保存失败', e); }
    }

    // 更新状态
    const testUsers = this.data.testUsers.slice();
    testUsers[idx].added = true;
    this.setData({ testUsers });
    this._refreshMeeting();
    this._showToast(user.name + ' 已加入碰头');
  },

  onRemoveTestUser(e) {
    const idx = e.currentTarget.dataset.index;
    const user = this.data.testUsers[idx];
    if (!user || !user.added) return;

    const meeting = meetingMgr.getMeeting(this.data.meetingId);
    if (!meeting) return;

    // 从成员中移除
    meeting.members = meeting.members.filter(m => m.userId !== user.id);
    // 保存
    try {
      const all = wx.getStorageSync('meetings') || {};
      all[meeting.id] = meeting;
      wx.setStorageSync('meetings', all);
    } catch (e) { console.error('保存失败', e); }

    const testUsers = this.data.testUsers.slice();
    testUsers[idx].added = false;
    this.setData({ testUsers });
    this._refreshMeeting();
    this._showToast(user.name + ' 已退出');
  },

  onAddAllTestUsers() {
    const meeting = meetingMgr.getMeeting(this.data.meetingId);
    if (!meeting) return;
    const testUsers = this.data.testUsers.slice();
    let addedCount = 0;

    testUsers.forEach(user => {
      if (user.added) return;
      if (!meeting.members.find(m => m.userId === user.id)) {
        meeting.members.push({
          userId: user.id,
          nickname: user.name,
          avatarUrl: '',
          latitude: user.lat,
          longitude: user.lng,
          lastUpdate: Date.now(),
          isCreator: false,
          isManual: false
        });
        user.added = true;
        addedCount++;
      }
    });

    try {
      const all = wx.getStorageSync('meetings') || {};
      all[meeting.id] = meeting;
      wx.setStorageSync('meetings', all);
    } catch (e) { console.error('保存失败', e); }

    this.setData({ testUsers });
    this._refreshMeeting();
    this._showToast('已添加 ' + addedCount + ' 名模拟用户');
  },

  onRemoveAllTestUsers() {
    const meeting = meetingMgr.getMeeting(this.data.meetingId);
    if (!meeting) return;
    const testIds = this.data.testUsers.map(u => u.id);
    meeting.members = meeting.members.filter(m => testIds.indexOf(m.userId) === -1);

    try {
      const all = wx.getStorageSync('meetings') || {};
      all[meeting.id] = meeting;
      wx.setStorageSync('meetings', all);
    } catch (e) { console.error('保存失败', e); }

    const testUsers = this.data.testUsers.map(u => Object.assign({}, u, { added: false }));
    this.setData({ testUsers });
    this._refreshMeeting();
    this._showToast('已移除所有模拟用户');
  },

  onCloseTestTool() {
    this.setData({ showTestTool: false });
  },

  // ========== 分享 ==========

  onShareAppMessage() {
    const info = app.globalData.userInfo || {};
    const userName = info.nickname || '好友';
    const meeting = this._getMeeting();
    const memberCount = meeting ? meeting.members.length : 1;
    const poiName = (meeting && meeting.meetPoint) ? meeting.meetPoint.name : '';

    let title;
    if (poiName) {
      title = userName + '约你在' + poiName + '碰面，路线已规划好！';
    } else if (memberCount > 1) {
      title = userName + '和' + (memberCount - 1) + '个朋友在等你，快来碰面！';
    } else {
      title = userName + '发起了碰面，帮你规划最佳路线';
    }

    const path = '/pages/join/join?id=' + this.data.meetingId
      + '&inviter=' + encodeURIComponent(userName)
      + '&count=' + memberCount
      + '&poi=' + encodeURIComponent(poiName || '');

    return { title, path, imageUrl: this._shareImageUrl || '' };
  },

  // ========== Toast ==========

  _showToast(text) {
    this.setData({ toastText: text });
    setTimeout(() => this.setData({ toastText: '' }), 2500);
  },

  _getMeeting() {
    return meetingMgr.getMeeting(this.data.meetingId);
  },

  _generateShareImage() {
    const query = wx.createSelectorQuery();
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo ? (wx.getWindowInfo().pixelRatio || 2) : 2;
      canvas.width = 500 * dpr;
      canvas.height = 400 * dpr;
      ctx.scale(dpr, dpr);

      // 渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 500, 400);
      gradient.addColorStop(0, '#EBF2FF');
      gradient.addColorStop(1, '#D4E4FF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 500, 400);

      // 装饰圆
      ctx.fillStyle = 'rgba(74,127,229,0.06)';
      ctx.beginPath(); ctx.arc(80, 60, 40, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(420, 100, 30, 0, Math.PI * 2); ctx.fill();

      // 品牌圆 + 定位图标
      ctx.fillStyle = '#4A7FE5';
      ctx.beginPath(); ctx.arc(250, 100, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(250, 95, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(250, 108); ctx.lineTo(243, 97); ctx.lineTo(257, 97); ctx.closePath(); ctx.fill();

      // 参与人首字头像
      const meeting = this._getMeeting();
      const members = meeting ? meeting.members : [];
      const colors = ['#4A7FE5', '#FF6B6B', '#FFB347', '#2ECC71', '#9B59B6'];
      const count = Math.min(members.length, 5);
      const startX = 250 - (count * 22);
      for (var i = 0; i < count; i++) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(startX + i * 44, 185, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(startX + i * 44, 185, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((members[i].nickname || '?').charAt(0), startX + i * 44, 185);
      }

      // 地点文字
      ctx.fillStyle = '#1A1A2E';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var poiText = (meeting && meeting.meetPoint) ? meeting.meetPoint.name : '等你来选碰面点';
      ctx.fillText(poiText, 250, 240);

      // 参与人数
      ctx.fillStyle = '#6B7280';
      ctx.font = '16px sans-serif';
      ctx.fillText(members.length + '人已加入 · 等你来', 250, 270);

      // 底部品牌栏
      ctx.fillStyle = 'rgba(74,127,229,0.08)';
      ctx.fillRect(0, 350, 500, 50);
      ctx.fillStyle = '#4A7FE5';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('碰面 · 约个地儿', 250, 375);

      // 导出
      var self = this;
      wx.canvasToTempFilePath({
        canvas: canvas,
        success: function(imgRes) { self._shareImageUrl = imgRes.tempFilePath; },
        fail: function(err) { console.warn('生成分享封面失败:', err); }
      });
    });
  }
});
