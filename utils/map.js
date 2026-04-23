/**
 * 地图服务模块
 * 封装腾讯地图 API：POI 搜索、驾车路线规划、逆地理编码
 */

const app = getApp();
const QQMapWX = require('./qqmap-wx-jssdk.min.js');

// 延迟初始化 SDK 实例（app.globalData 在 require 时可能还没就绪）
var _qqmapsdk = null;
var _qqmapsdkKey = '';
function getQQMapSDK() {
  var key = app.globalData.mapKey;
  if (!_qqmapsdk || _qqmapsdkKey !== key) {
    _qqmapsdk = new QQMapWX({ key: key });
    _qqmapsdkKey = key;
  }
  return _qqmapsdk;
}

// 地点类型配置
const PLACE_TYPES = [
  { id: 'food',    keyword: '美食',   icon: '/images/icons/icon-food.svg',     label: '美食' },
  { id: 'park',    keyword: '公园',   icon: '/images/icons/icon-park.svg',     label: '公园' },
  { id: 'cafe',    keyword: '咖啡店', icon: '/images/icons/icon-cafe.svg',     label: '咖啡店' },
  { id: 'subway',  keyword: '地铁站', icon: '/images/icons/icon-subway.svg',   label: '地铁站' },
  { id: 'mall',    keyword: '商场',   icon: '/images/icons/icon-mall.svg',     label: '商场' },
  { id: 'biz',     keyword: '商业圈', icon: '/images/icons/icon-district.svg', label: '商业圈' }
];

/**
 * 在中心点附近搜索 POI
 * @returns {Promise<Array>} 最多10个
 */
function searchPOI(center, placeTypeId, radius) {
  const type = PLACE_TYPES.find(t => t.id === placeTypeId);
  if (!type) return Promise.resolve([]);
  const key = app.globalData.mapKey;

  return new Promise((resolve) => {
    wx.request({
      url: 'https://apis.map.qq.com/ws/place/v1/search',
      data: {
        keyword: type.keyword,
        boundary: 'nearby(' + center.latitude + ',' + center.longitude + ',' + radius + ')',
        page_size: 10,
        page_index: 1,
        orderby: '_distance',
        key: key
      },
      success(res) {
        if (res.data && res.data.status === 0 && res.data.data) {
          resolve(res.data.data.map(function (poi, i) {
            return {
              id: poi.id || ('poi_' + i),
              name: poi.title || '',
              type: poi.category || type.label,
              address: poi.address || '',
              tel: poi.tel || '',
              rating: poi._rating || '',
              photos: poi._photos || [],
              latitude: poi.location.lat,
              longitude: poi.location.lng,
              distance: poi._distance || 0,
              distanceText: _fmtDist(poi._distance)
            };
          }));
        } else {
          resolve(_mockPOI(center, type, radius));
        }
      },
      fail() { resolve(_mockPOI(center, type, radius)); }
    });
  });
}

/**
 * 通过 SDK direction 解压 polyline 为坐标点数组
 */
function _sdkDecompressPolyline(coors) {
  if (!coors || coors.length < 2) return [];
  var arr = coors.slice();
  for (var i = 2; i < arr.length; i++) {
    arr[i] = Number(arr[i - 2]) + Number(arr[i]) / 1000000;
  }
  var points = [];
  for (var j = 0; j < arr.length; j += 2) {
    points.push({ latitude: arr[j], longitude: arr[j + 1] });
  }
  return points;
}

/**
 * 驾车路线规划（通过腾讯地图小程序 SDK）
 * @param {object} from - { latitude, longitude }
 * @param {object} to   - { latitude, longitude }
 * @returns {Promise<{distance, duration, polyline, isMock}>}
 */
function drivingRoute(from, to) {
  const key = app.globalData.mapKey;
  // 如果是占位符 Key，直接走模拟
  if (!key || key === 'YOUR_TENCENT_MAP_KEY') {
    var dist = _haversine(from.latitude, from.longitude, to.latitude, to.longitude);
    var mockPts = _mockRoadRoute(from, to, dist, 'driving');
    var drivingDist = Math.round(dist * 1.35);
    var drivingTime = Math.round(drivingDist / (35000 / 3600));
    return Promise.resolve({
      distance: drivingDist,
      duration: drivingTime,
      distanceText: _fmtDist(drivingDist),
      durationText: _fmtTime(drivingTime),
      polyline: mockPts,
      mode: 'driving',
      isMock: true
    });
  }
  return new Promise(function(resolve) {
    getQQMapSDK().direction({
      mode: 'driving',
      from: from.latitude + ',' + from.longitude,
      to: to.latitude + ',' + to.longitude,
      policy: 'LEAST_TIME',
      success: function(res) {
        console.log('[drivingRoute] SDK success, status:', res.status);
        if (res.status === 0 && res.result && res.result.routes && res.result.routes.length > 0) {
          var route = res.result.routes[0];
          var points = _sdkDecompressPolyline(route.polyline);
          resolve({
            distance: route.distance,
            duration: route.duration,
            distanceText: _fmtDist(route.distance),
            durationText: _fmtTime(route.duration),
            polyline: points,
            mode: 'driving',
            isMock: false
          });
        } else {
          console.warn('[drivingRoute] SDK returned no routes:', res.status, res.message);
          _resolveMockDriving(from, to, resolve);
        }
      },
      fail: function(err) {
        console.error('[drivingRoute] SDK fail:', JSON.stringify(err));
        _resolveMockDriving(from, to, resolve);
      }
    });
  });
}

function _resolveMockDriving(from, to, resolve) {
  var dist = _haversine(from.latitude, from.longitude, to.latitude, to.longitude);
  var mockPts = _mockRoadRoute(from, to, dist, 'driving');
  var drivingDist = Math.round(dist * 1.35);
  var drivingTimeSec = Math.round(drivingDist / (35000 / 3600)); // 秒
  var drivingTimeMin = Math.round(drivingTimeSec / 60); // 转为分钟
  resolve({
    distance: drivingDist,
    duration: drivingTimeMin,
    distanceText: _fmtDist(drivingDist),
    durationText: _fmtTime(drivingTimeMin),
    polyline: mockPts,
    mode: 'driving',
    isMock: true
  });
}

/**
 * 逆地理编码：坐标 → 地址名称
 */
function reverseGeocode(lat, lng) {
  const key = app.globalData.mapKey;
  return new Promise((resolve) => {
    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: { location: lat + ',' + lng, key: key },
      success(res) {
        if (res.data && res.data.status === 0 && res.data.result) {
          resolve({
            address: res.data.result.address || '',
            name: (res.data.result.formatted_addresses && res.data.result.formatted_addresses.recommend) || res.data.result.address || '未知位置'
          });
        } else {
          resolve({ address: '', name: '未知位置' });
        }
      },
      fail() { resolve({ address: '', name: '未知位置' }); }
    });
  });
}

/**
 * 搜索地点（关键词）
 */
function searchByKeyword(keyword, center) {
  const key = app.globalData.mapKey;
  return new Promise((resolve) => {
    wx.request({
      url: 'https://apis.map.qq.com/ws/place/v1/search',
      data: {
        keyword: keyword,
        boundary: 'nearby(' + center.latitude + ',' + center.longitude + ',50000)',
        page_size: 10,
        key: key
      },
      success(res) {
        if (res.data && res.data.status === 0 && res.data.data && res.data.data.length > 0) {
          resolve(res.data.data.map(function (poi, i) {
            return {
              id: poi.id || ('s_' + i),
              name: poi.title || '',
              address: poi.address || '',
              latitude: poi.location.lat,
              longitude: poi.location.lng
            };
          }));
        } else {
          // API 失败或无结果时使用模拟搜索结果
          console.log('[searchByKeyword] API无结果，使用模拟数据, keyword:', keyword);
          resolve(_mockSearch(keyword, center));
        }
      },
      fail() {
        console.log('[searchByKeyword] API请求失败，使用模拟数据');
        resolve(_mockSearch(keyword, center));
      }
    });
  });
}

/**
 * 步行路线规划（通过腾讯地图小程序 SDK）
 * @param {object} from - { latitude, longitude }
 * @param {object} to   - { latitude, longitude }
 * @returns {Promise<{distance, duration, distanceText, durationText, polyline, mode, isMock}>}
 */
function walkingRoute(from, to) {
  const key = app.globalData.mapKey;
  // 如果是占位符 Key，直接走模拟
  if (!key || key === 'YOUR_TENCENT_MAP_KEY') {
    var dist = _haversine(from.latitude, from.longitude, to.latitude, to.longitude);
    var mockPts = _mockRoadRoute(from, to, dist, 'walking');
    var walkDist = Math.round(dist * 1.25);
    var walkTime = Math.round(walkDist / 1.2);
    return Promise.resolve({
      distance: walkDist,
      duration: walkTime,
      distanceText: _fmtDist(walkDist),
      durationText: _fmtTime(walkTime),
      polyline: mockPts,
      mode: 'walking',
      isMock: true
    });
  }
  return new Promise(function(resolve) {
    getQQMapSDK().direction({
      mode: 'walking',
      from: from.latitude + ',' + from.longitude,
      to: to.latitude + ',' + to.longitude,
      success: function(res) {
        console.log('[walkingRoute] SDK success, status:', res.status);
        if (res.status === 0 && res.result && res.result.routes && res.result.routes.length > 0) {
          var route = res.result.routes[0];
          var points = _sdkDecompressPolyline(route.polyline);
          resolve({
            distance: route.distance,
            duration: route.duration,
            distanceText: _fmtDist(route.distance),
            durationText: _fmtTime(route.duration),
            polyline: points,
            mode: 'walking',
            isMock: false
          });
        } else {
          console.warn('[walkingRoute] SDK returned no routes:', res.status, res.message);
          _resolveMockWalking(from, to, resolve);
        }
      },
      fail: function(err) {
        console.error('[walkingRoute] SDK fail:', JSON.stringify(err));
        _resolveMockWalking(from, to, resolve);
      }
    });
  });
}

function _resolveMockWalking(from, to, resolve) {
  var dist = _haversine(from.latitude, from.longitude, to.latitude, to.longitude);
  var mockPts = _mockRoadRoute(from, to, dist, 'walking');
  var walkDist = Math.round(dist * 1.25);
  var walkTimeSec = Math.round(walkDist / 1.2); // 秒
  var walkTimeMin = Math.round(walkTimeSec / 60); // 转为分钟
  resolve({
    distance: walkDist,
    duration: walkTimeMin,
    distanceText: _fmtDist(walkDist),
    durationText: _fmtTime(walkTimeMin),
    polyline: mockPts,
    mode: 'walking',
    isMock: true
  });
}

// ---- 内部工具 ----

/**
 * 解压腾讯地图 API 返回的压缩 polyline
 * 腾讯地图的 polyline 格式：差分压缩，所有值都是 ×10^6 的整数
 * 前两个值是绝对坐标（×10^6），后续值是差值（×10^6）
 */
function _decompressPolyline(polyline) {
  if (!polyline || polyline.length < 2) return [];
  var coors = polyline.slice();
  // 前两个是绝对值，需要除以 10^6
  coors[0] = coors[0] / 1000000;
  coors[1] = coors[1] / 1000000;
  // 后续值是差值（也是 ×10^6），累加到前一个同维度的值上
  for (var i = 2; i < coors.length; i++) {
    coors[i] = coors[i - 2] + coors[i] / 1000000;
  }
  var points = [];
  for (var j = 0; j < coors.length; j += 2) {
    points.push({ latitude: coors[j], longitude: coors[j + 1] });
  }
  return points;
}

function _haversine(lat1, lng1, lat2, lng2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _fmtDist(m) {
  if (!m && m !== 0) return '';
  if (m < 1000) return Math.round(m) + 'm';
  return (m / 1000).toFixed(1) + 'km';
}

/**
 * 格式化时间
 * @param {number} min - 时间（分钟）
 * 2小时以内展示分钟，2小时以上展示小时
 */
function _fmtTime(min) {
  if (!min && min !== 0) return '';
  min = Math.round(min);
  if (min < 1) return '约1分钟';
  // 2小时（120分钟）以内，展示分钟
  if (min <= 120) return min + '分钟';
  // 2小时以上，展示小时（保留1位小数）
  var hours = min / 60;
  if (hours === Math.floor(hours)) {
    return Math.floor(hours) + '小时';
  }
  return hours.toFixed(1) + '小时';
}

function _mockPOI(center, type, radius) {
  var names = {
    food: ['老王家饺子馆', '川味坊', '江南小厨', '鲜味轩', '粤味居', '日料·花见', '韩式烤肉', '意式简餐', '火锅先生', '面条工坊'],
    park: ['中心公园', '人民公园', '湿地花园', '滨江绿道', '植物园', '森林公园', '体育公园', '儿童乐园', '文化广场', '生态园'],
    cafe: ['星巴克', '瑞幸咖啡', 'Manner', 'M Stand', 'Seesaw', '%Arabica', '太平洋咖啡', 'Costa', '蓝瓶咖啡', '皮爷咖啡'],
    subway: ['中心站', '人民广场站', '南京路站', '科技园站', '大学城站', '火车站', '机场站', '商业街站', '市政府站', '公园站'],
    mall: ['万达广场', '银泰百货', '华润万象城', 'SKP', '大悦城', '龙湖天街', '印象城', '吾悦广场', '环球港', '来福士'],
    biz: ['CBD中心', '科技园', '金融街', '商务中心', '创业大厦', '产业园', '总部基地', '电商园', '文创园', '智慧谷']
  };
  var list = names[type.id] || names.food;
  var results = [];
  for (var i = 0; i < list.length; i++) {
    var offLat = (Math.random() - 0.5) * (radius / 111000);
    var offLng = (Math.random() - 0.5) * (radius / (111000 * Math.cos(center.latitude * Math.PI / 180)));
    var dist = Math.round(Math.sqrt(offLat * offLat + offLng * offLng) * 111000);
    results.push({
      id: 'mock_' + type.id + '_' + i,
      name: list[i],
      type: type.label,
      address: '模拟地址·距中心约' + dist + 'm',
      tel: '010-' + (10000000 + Math.floor(Math.random() * 90000000)),
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      photos: [],
      latitude: center.latitude + offLat,
      longitude: center.longitude + offLng,
      distance: dist,
      distanceText: _fmtDist(dist)
    });
  }
  results.sort(function (a, b) { return a.distance - b.distance; });
  return results;
}

/**
 * 生成模拟道路路线（更贴合真实城市道路）
 * 策略：模拟城市路网中"先沿一条路走，再转弯走另一条路"的 L 形 / Z 形路线
 * 而不是简单的直线弯曲
 * @param {object} from - 起点 { latitude, longitude }
 * @param {object} to   - 终点 { latitude, longitude }
 * @param {number} distance - 直线距离（米）
 * @param {string} mode - 'driving' | 'walking'
 */
function _mockRoadRoute(from, to, distance, mode) {
  var points = [];
  var dLat = to.latitude - from.latitude;
  var dLng = to.longitude - from.longitude;

  // 城市道路网格间距约 200-400 米，转化为经纬度增量
  var gridSize = 0.003; // 约 330 米

  // 使用确定性的种子（基于起终点坐标），使同一对起终点产生相同路线
  var seed = Math.abs(from.latitude * 1000 + from.longitude * 1000 + to.latitude * 100 + to.longitude * 100);
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  points.push({ latitude: from.latitude, longitude: from.longitude });

  if (distance < 300) {
    // 距离很近时，生成简单的 L 形转弯路线
    var midLat = from.latitude + dLat * 0.3;
    var midLng = from.longitude;
    points.push({ latitude: midLat, longitude: midLng });
    points.push({ latitude: midLat, longitude: to.longitude });
    // 沿终点纬度走一小段
    points.push({ latitude: to.latitude, longitude: to.longitude });
  } else if (distance < 2000) {
    // 中等距离：Z 形路线（2-3个转弯）
    var turnCount = 2 + Math.floor(pseudoRandom() * 2); // 2-3 个转弯
    var latStep = dLat / (turnCount + 1);
    var lngStep = dLng / (turnCount + 1);

    for (var i = 1; i <= turnCount; i++) {
      var t = i / (turnCount + 1);
      // 交替在经度和纬度方向前进，模拟 Z 形
      if (i % 2 === 1) {
        // 先纵向移动
        var wpLat = from.latitude + latStep * i + (pseudoRandom() - 0.5) * gridSize * 0.5;
        var wpLng = from.longitude + lngStep * (i - 1) + (pseudoRandom() - 0.5) * gridSize * 0.3;
        points.push({ latitude: wpLat, longitude: wpLng });
        // 转弯点（开始横向移动）
        wpLng = from.longitude + lngStep * i + (pseudoRandom() - 0.5) * gridSize * 0.3;
        points.push({ latitude: wpLat, longitude: wpLng });
      } else {
        // 先横向移动
        var wpLat2 = from.latitude + latStep * (i - 1) + (pseudoRandom() - 0.5) * gridSize * 0.3;
        var wpLng2 = from.longitude + lngStep * i + (pseudoRandom() - 0.5) * gridSize * 0.5;
        points.push({ latitude: wpLat2, longitude: wpLng2 });
        // 转弯点（开始纵向移动）
        wpLat2 = from.latitude + latStep * i + (pseudoRandom() - 0.5) * gridSize * 0.3;
        points.push({ latitude: wpLat2, longitude: wpLng2 });
      }
    }

    points.push({ latitude: to.latitude, longitude: to.longitude });
  } else {
    // 长距离路线：模拟主干道 + 匝道
    // 先离开起点（沿最近的"主路"走），然后沿主路方向前进，最后转入终点方向
    var numSegments = Math.max(4, Math.min(10, Math.floor(distance / 800)));
    // 选择一个偏移方向（模拟不是直接走直线而是绕路）
    var detourDir = pseudoRandom() > 0.5 ? 1 : -1;
    var detourAmount = gridSize * (1 + pseudoRandom() * 2) * detourDir;

    // 阶段1：离开起点，先沿垂直方向到"主路"
    var phase1Lat = from.latitude + dLat * 0.08;
    var phase1Lng = from.longitude + detourAmount * 0.6;
    points.push({ latitude: phase1Lat, longitude: phase1Lng });

    // 阶段2：沿主路方向行驶（添加多个中间点模拟道路弯曲）
    for (var s = 1; s <= numSegments - 2; s++) {
      var t2 = s / numSegments;
      var segLat = from.latitude + dLat * t2;
      var segLng = from.longitude + dLng * t2;
      // 道路不完全笔直，有轻微偏移
      var roadOffset = detourAmount * (1 - t2) * 0.5;
      // 模拟道路的微小弯曲
      var curvature = Math.sin(t2 * Math.PI * 2) * gridSize * 0.3;
      // 步行路线走小路，偏移更多
      var walkOffset = mode === 'walking' ? (pseudoRandom() - 0.5) * gridSize * 0.4 : 0;

      points.push({
        latitude: segLat + curvature * 0.3 + walkOffset * 0.5,
        longitude: segLng + roadOffset + curvature * 0.5 + walkOffset
      });
    }

    // 阶段3：从主路转入终点
    var phase3Lat = to.latitude - dLat * 0.08;
    var phase3Lng = to.longitude + detourAmount * 0.15;
    points.push({ latitude: phase3Lat, longitude: phase3Lng });

    points.push({ latitude: to.latitude, longitude: to.longitude });
  }

  // 在所有相邻点对之间插值，使路线更平滑（每对之间插入 2-4 个点）
  var smoothed = [];
  for (var k = 0; k < points.length - 1; k++) {
    var p1 = points[k];
    var p2 = points[k + 1];
    smoothed.push(p1);

    var segDist = _haversine(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    var interpCount = Math.max(2, Math.min(5, Math.round(segDist / 200)));

    for (var j = 1; j < interpCount; j++) {
      var tt = j / interpCount;
      // 使用平滑插值 + 微小道路偏移
      var jitter = (pseudoRandom() - 0.5) * 0.0002;
      smoothed.push({
        latitude: p1.latitude + (p2.latitude - p1.latitude) * tt + jitter * 0.5,
        longitude: p1.longitude + (p2.longitude - p1.longitude) * tt + jitter
      });
    }
  }
  smoothed.push(points[points.length - 1]);

  return smoothed;
}

/**
 * 模拟搜索结果（API key 无效时的 fallback）
 */
function _mockSearch(keyword, center) {
  var mockNames = [
    keyword + '·中心店', keyword + '(旗舰店)', keyword + '广场店',
    keyword + '·南路店', keyword + '(人民路)', keyword + '大厦',
    keyword + '·文化中心', keyword + '(科技园)', keyword + '购物中心',
    keyword + '·新天地'
  ];
  var results = [];
  var radius = 5000; // 5km 范围
  for (var i = 0; i < mockNames.length; i++) {
    var offLat = (Math.random() - 0.5) * (radius / 111000) * 2;
    var offLng = (Math.random() - 0.5) * (radius / (111000 * Math.cos(center.latitude * Math.PI / 180))) * 2;
    var dist = Math.round(Math.sqrt(offLat * offLat + offLng * offLng) * 111000);
    results.push({
      id: 'ms_' + i + '_' + Date.now(),
      name: mockNames[i],
      address: '模拟地址·距当前' + _fmtDist(dist),
      latitude: center.latitude + offLat,
      longitude: center.longitude + offLng
    });
  }
  results.sort(function (a, b) {
    var dA = _haversine(center.latitude, center.longitude, a.latitude, a.longitude);
    var dB = _haversine(center.latitude, center.longitude, b.latitude, b.longitude);
    return dA - dB;
  });
  return results;
}

/**
 * 获取 POI 详情（照片、评分、电话等）
 * @param {string} poiId - POI 的 id
 * @returns {Promise<{name, address, tel, rating, photos}>}
 */
function getPlaceDetail(poiId) {
  const key = app.globalData.mapKey;
  return new Promise((resolve) => {
    wx.request({
      url: 'https://apis.map.qq.com/ws/place/v1/detail',
      data: { id: poiId, key: key },
      success(res) {
        if (res.data && res.data.status === 0 && res.data.result) {
          var d = res.data.result;
          resolve({
            id: d.id || poiId,
            name: d.title || '',
            type: d.category || '',
            address: d.address || '',
            tel: d.tel || '',
            rating: (d.rating && d.rating.score) ? d.rating.score : '',
            photos: (d.photos || []).map(function (p) { return p.url || ''; }).filter(Boolean),
            latitude: d.location ? d.location.lat : 0,
            longitude: d.location ? d.location.lng : 0
          });
        } else {
          resolve(null);
        }
      },
      fail() { resolve(null); }
    });
  });
}

/**
 * 点击地图位置 → 反查附近最近 POI
 * 先逆地理编码获取地名，再搜索附近 POI 取第一个
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{name, address, latitude, longitude, type, tel, rating, photos, poiId}>}
 */
function tapLocationInfo(lat, lng) {
  var key = app.globalData.mapKey;
  // 并行请求：逆地理编码 + 附近 POI
  var geoPromise = reverseGeocode(lat, lng);
  var poiPromise = new Promise(function (resolve) {
    wx.request({
      url: 'https://apis.map.qq.com/ws/place/v1/search',
      data: {
        keyword: '地点',
        boundary: 'nearby(' + lat + ',' + lng + ',200)',
        page_size: 1,
        page_index: 1,
        orderby: '_distance',
        key: key
      },
      success: function (res) {
        if (res.data && res.data.status === 0 && res.data.data && res.data.data.length > 0) {
          var poi = res.data.data[0];
          resolve({
            poiId: poi.id || '',
            name: poi.title || '',
            type: poi.category || '',
            address: poi.address || '',
            tel: poi.tel || '',
            latitude: poi.location ? poi.location.lat : lat,
            longitude: poi.location ? poi.location.lng : lng,
            distance: poi._distance || 0
          });
        } else {
          resolve(null);
        }
      },
      fail: function () { resolve(null); }
    });
  });

  return Promise.all([geoPromise, poiPromise]).then(function (results) {
    var geo = results[0];
    var poi = results[1];
    // 如果找到附近 POI 且距离 < 200m，用 POI 信息
    if (poi && poi.distance < 200) {
      return {
        id: poi.poiId || ('tap_' + Date.now()),
        poiId: poi.poiId,
        name: poi.name || geo.name || '选中位置',
        type: poi.type || '',
        address: poi.address || geo.address || '',
        tel: poi.tel || '',
        rating: '',
        photos: [],
        latitude: poi.latitude,
        longitude: poi.longitude
      };
    }
    // 否则用逆地理编码结果
    return {
      id: 'tap_' + Date.now(),
      poiId: '',
      name: geo.name || '选中位置',
      type: '',
      address: geo.address || '',
      tel: '',
      rating: '',
      photos: [],
      latitude: lat,
      longitude: lng
    };
  });
}

module.exports = {
  PLACE_TYPES,
  searchPOI,
  drivingRoute,
  walkingRoute,
  reverseGeocode,
  searchByKeyword,
  getPlaceDetail,
  tapLocationInfo
};
