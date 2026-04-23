/**
 * 碰头活动管理模块（自建服务器版本）
 * 通过 utils/api.js 调用后端 HTTP API
 * 本地缓存仅用于加速首屏展示
 */

const api = require('./api');

const MAX_MEMBERS = 20;

/**
 * 发起碰头
 */
async function createMeeting(userInfo) {
  const res = await api.callFunction('createMeeting', {
    nickname: userInfo.nickname,
    avatarUrl: userInfo.avatarUrl
  });
  if (res.ok) {
    const meetingId = res.meetingId;
    _cacheSet(meetingId, {
      id: meetingId,
      creatorId: userInfo.userId,
      members: [{
        userId: userInfo.userId,
        nickname: userInfo.nickname || '我',
        avatarUrl: userInfo.avatarUrl || '',
        latitude: null,
        longitude: null,
        lastUpdate: 0,
        isCreator: true,
        isManual: false
      }],
      manualFriends: [],
      meetPoint: null,
      status: 1
    });
    return { id: meetingId, ok: true };
  }
  return null;
}

/**
 * 加入碰头
 */
async function joinMeeting(meetingId, userInfo) {
  const res = await api.callFunction('joinMeeting', {
    meetingId: meetingId,
    nickname: userInfo.nickname,
    avatarUrl: userInfo.avatarUrl
  });
  return res; // { ok, meetingId, msg }
}

/**
 * 获取碰头详情（优先服务器，降级本地缓存）
 */
async function getMeetingAsync(meetingId) {
  try {
    const res = await api.callFunction('getMeeting', { meetingId });
    if (res.ok) {
      const meeting = _convertCloudMeeting(res.meeting);
      _cacheSet(meetingId, meeting);
      return meeting;
    }
  } catch (e) {
    console.warn('服务器获取碰头失败，使用缓存:', e);
  }
  return _cacheGet(meetingId);
}

/**
 * 同步获取碰头（从本地缓存）
 */
function getMeeting(meetingId) {
  return _cacheGet(meetingId);
}

/**
 * 上报位置
 */
async function updateLocationAsync(meetingId, userId, lat, lng) {
  const cached = _cacheGet(meetingId);
  if (cached) {
    const m = cached.members.find(x => x.userId === userId);
    if (m && !m.isManual) {
      m.latitude = lat;
      m.longitude = lng;
      m.lastUpdate = Date.now();
      _cacheSet(meetingId, cached);
    }
  }

  try {
    await api.callFunction('updateLocation', {
      meetingId, latitude: lat, longitude: lng
    });
  } catch (e) {
    console.warn('位置上报失败:', e);
  }
}

function updateLocation(meetingId, userId, lat, lng) {
  updateLocationAsync(meetingId, userId, lat, lng);
  return _cacheGet(meetingId);
}

/**
 * 添加手动好友位置
 */
async function addManualFriendAsync(meetingId, friendInfo) {
  const res = await api.callFunction('addManualFriend', {
    meetingId,
    name: friendInfo.name,
    latitude: friendInfo.latitude,
    longitude: friendInfo.longitude,
    address: friendInfo.address || ''
  });
  if (res.ok) {
    const cached = _cacheGet(meetingId);
    if (cached) {
      cached.manualFriends.push(res.friend);
      _cacheSet(meetingId, cached);
    }
    return res;
  }
  return null;
}

function addManualFriend(meetingId, friendInfo) {
  addManualFriendAsync(meetingId, friendInfo);
  const cached = _cacheGet(meetingId);
  if (cached) {
    const friend = {
      id: 'mf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: friendInfo.name || '好友',
      latitude: friendInfo.latitude,
      longitude: friendInfo.longitude,
      address: friendInfo.address || '',
      isManual: true,
      createTime: Date.now()
    };
    cached.manualFriends.push(friend);
    _cacheSet(meetingId, cached);
    return { meeting: cached, friend };
  }
  return null;
}

/**
 * 删除手动好友
 */
async function removeManualFriendAsync(meetingId, friendId) {
  await api.callFunction('removeManualFriend', { meetingId, friendId });
}

function removeManualFriend(meetingId, friendId) {
  removeManualFriendAsync(meetingId, friendId);
  const cached = _cacheGet(meetingId);
  if (cached) {
    cached.manualFriends = cached.manualFriends.filter(f => f.id !== friendId);
    _cacheSet(meetingId, cached);
  }
  return cached;
}

/**
 * 设置碰头地点
 */
async function setMeetPointAsync(meetingId, place) {
  await api.callFunction('setMeetPoint', { meetingId, place });
}

function setMeetPoint(meetingId, place) {
  setMeetPointAsync(meetingId, place);
  const cached = _cacheGet(meetingId);
  if (cached) {
    cached.meetPoint = {
      id: place.id || ('mp_' + Date.now()),
      name: place.name,
      type: place.type || '',
      address: place.address || '',
      tel: place.tel || '',
      rating: place.rating || '',
      photos: place.photos || [],
      latitude: place.latitude,
      longitude: place.longitude,
      setTime: Date.now()
    };
    _cacheSet(meetingId, cached);
  }
  return cached;
}

/**
 * 取消碰头地点
 */
function removeMeetPoint(meetingId) {
  api.callFunction('removeMeetPoint', { meetingId });
  const cached = _cacheGet(meetingId);
  if (cached) {
    cached.meetPoint = null;
    _cacheSet(meetingId, cached);
  }
  return cached;
}

/**
 * 结束碰头
 */
async function endMeetingAsync(meetingId) {
  await api.callFunction('endMeeting', { meetingId });
}

function deleteMeeting(meetingId) {
  endMeetingAsync(meetingId);
  _cacheDel(meetingId);
}

/**
 * 获取所有位置点
 */
function getAllLocationPoints(meeting) {
  const points = [];
  if (!meeting) return points;
  meeting.members.forEach(m => {
    if (m.latitude && m.longitude) {
      points.push({
        id: m.userId,
        name: m.nickname,
        avatarUrl: m.avatarUrl,
        latitude: m.latitude,
        longitude: m.longitude,
        isManual: false
      });
    }
  });
  meeting.manualFriends.forEach(f => {
    if (f.latitude && f.longitude) {
      points.push({
        id: f.id,
        name: f.name,
        avatarUrl: '',
        latitude: f.latitude,
        longitude: f.longitude,
        isManual: true,
        address: f.address
      });
    }
  });
  return points;
}

/**
 * 启动实时轮询（替代云开发 watch）
 * 每 3 秒拉取一次最新数据
 */
function watchMeeting(meetingId, onChange) {
  const timer = setInterval(async () => {
    try {
      const res = await api.callFunction('getMeeting', { meetingId });
      if (res.ok) {
        const meeting = _convertCloudMeeting(res.meeting);
        _cacheSet(meetingId, meeting);
        if (onChange) onChange(meeting);
      }
    } catch (e) {
      console.warn('轮询碰头数据失败:', e);
    }
  }, 3000);

  // 返回一个 close 方法，与云开发 watcher 接口一致
  return { close: function() { clearInterval(timer); } };
}

// ---- 内部工具：数据格式转换 ----

function _convertCloudMeeting(doc) {
  return {
    id: doc._id,
    creatorId: doc.creatorId,
    status: doc.status,
    members: (doc.members || []).map(m => ({
      userId: m.userId,
      nickname: m.nickname,
      avatarUrl: m.avatarUrl || '',
      latitude: m.latitude,
      longitude: m.longitude,
      lastUpdate: m.lastLocationAt ? new Date(m.lastLocationAt).getTime() : 0,
      isCreator: m.role === 1,
      isManual: false,
      _online: m.isOnline
    })),
    manualFriends: (doc.manualFriends || []).map(f => ({
      id: f.id,
      name: f.name,
      latitude: f.latitude,
      longitude: f.longitude,
      address: f.address || '',
      isManual: true,
      createTime: f.createdAt ? new Date(f.createdAt).getTime() : 0
    })),
    meetPoint: doc.meetPoint ? {
      id: doc.meetPoint.id,
      name: doc.meetPoint.name,
      type: doc.meetPoint.type || '',
      address: doc.meetPoint.address || '',
      tel: doc.meetPoint.tel || '',
      rating: doc.meetPoint.rating || '',
      photos: doc.meetPoint.photos || [],
      latitude: doc.meetPoint.latitude,
      longitude: doc.meetPoint.longitude,
      setTime: doc.meetPoint.setAt ? new Date(doc.meetPoint.setAt).getTime() : 0
    } : null,
    placeTypeFilter: doc.placeTypeFilter || ''
  };
}

// ---- 内部工具：本地缓存 ----

function _cacheGet(meetingId) {
  try {
    const all = wx.getStorageSync('meetings') || {};
    return all[meetingId] || null;
  } catch (e) { return null; }
}

function _cacheSet(meetingId, meeting) {
  try {
    const all = wx.getStorageSync('meetings') || {};
    all[meetingId] = meeting;
    wx.setStorageSync('meetings', all);
  } catch (e) {}
}

function _cacheDel(meetingId) {
  try {
    const all = wx.getStorageSync('meetings') || {};
    delete all[meetingId];
    wx.setStorageSync('meetings', all);
  } catch (e) {}
}

function generateMeetingId() { return ''; }
function setPlaceTypeFilter() { return null; }

module.exports = {
  MAX_MEMBERS,
  generateMeetingId,
  createMeeting,
  joinMeeting,
  updateLocation,
  updateLocationAsync,
  addManualFriend,
  addManualFriendAsync,
  removeManualFriend,
  setMeetPoint,
  removeMeetPoint,
  setPlaceTypeFilter,
  getAllLocationPoints,
  getMeeting,
  getMeetingAsync,
  deleteMeeting,
  watchMeeting
};
