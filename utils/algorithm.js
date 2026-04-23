/**
 * 算法模块：球面中心 + 距离计算
 */

function calculateCenter(points) {
  var valid = points.filter(function (p) { return p.latitude && p.longitude; });
  if (valid.length === 0) return null;
  var x = 0, y = 0, z = 0;
  valid.forEach(function (p) {
    var latR = p.latitude * Math.PI / 180;
    var lngR = p.longitude * Math.PI / 180;
    x += Math.cos(latR) * Math.cos(lngR);
    y += Math.cos(latR) * Math.sin(lngR);
    z += Math.sin(latR);
  });
  var n = valid.length;
  x /= n; y /= n; z /= n;
  return {
    latitude: Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI,
    longitude: Math.atan2(y, x) * 180 / Math.PI
  };
}

function haversine(lat1, lng1, lat2, lng2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m) {
  if (!m && m !== 0) return '';
  if (m < 1000) return Math.round(m) + 'm';
  return (m / 1000).toFixed(1) + 'km';
}

/**
 * 计算搜索半径（米）
 * 以中心点为基准，取所有点到中心最大距离 × 0.6，限制在 [800, 10000]
 */
function calculateSearchRadius(center, points) {
  var maxDist = 0;
  points.forEach(function (p) {
    if (p.latitude && p.longitude) {
      var d = haversine(center.latitude, center.longitude, p.latitude, p.longitude);
      if (d > maxDist) maxDist = d;
    }
  });
  return Math.max(800, Math.min(Math.round(maxDist * 0.6), 10000));
}

module.exports = {
  calculateCenter,
  haversine,
  formatDistance,
  calculateSearchRadius
};
