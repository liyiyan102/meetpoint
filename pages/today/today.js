// 今日去哪玩 · 星座MBTI智能推荐
// 参考今日去哪玩_Demo.html + 需求文档V1.3

// ========== 静态数据 ==========

const DURATION_OPTIONS = [
  { ico: '☕', val: '1小时内' },
  { ico: '🚶', val: '半天' },
  { ico: '🏔️', val: '一整天' }
]

const ENERGY_OPTIONS = [
  { ico: '🔋', val: '满血' },
  { ico: '🥱', val: '一般' },
  { ico: '🥲', val: '低电量' }
]

const PREF_OPTIONS = [
  { ico: '🍜', val: '吃' },
  { ico: '🛍️', val: '逛' },
  { ico: '☕', val: '静坐' },
  { ico: '🌳', val: '自然' },
  { ico: '📷', val: '拍照' },
  { ico: '🎪', val: '有趣' }
]

const DATE_QUICK = [
  { offset: 0, label: '今天' },
  { offset: 1, label: '明天' },
  { offset: 2, label: '后天' },
  { offset: 3, label: '大后天' },
  { offset: 7, label: '下周这天' }
]

// 星座（按四象分组，用 picker 的 range 展示）
const CONSTELLATION_LIST = [
  '❓ 不知道 / 不在意',
  '♈ 白羊座', '♌ 狮子座', '♐ 射手座',          // 🔥 火象
  '♉ 金牛座', '♍ 处女座', '♑ 摩羯座',          // 🌿 土象
  '♊ 双子座', '♎ 天秤座', '♒ 水瓶座',          // 💨 风象
  '♋ 巨蟹座', '♏ 天蝎座', '♓ 双鱼座'            // 💧 水象
]

const CONSTELLATION_READINGS = {
  '不知道': { icon: '🔮', text: '未知即可能 · 一切随缘' },
  '白羊':   { icon: '⚔️', text: '战神火星守护 · 行动力加成' },
  '金牛':   { icon: '🌹', text: '金星眷顾 · 感官敏锐' },
  '双子':   { icon: '💨', text: '水星加持 · 好奇心旺' },
  '巨蟹':   { icon: '🌙', text: '月亮守护 · 情感丰沛' },
  '狮子':   { icon: '☀️', text: '太阳护佑 · 自带光环' },
  '处女':   { icon: '🌾', text: '水星理智 · 细节通透' },
  '天秤':   { icon: '⚖️', text: '金星审美 · 平衡大师' },
  '天蝎':   { icon: '🦂', text: '冥王深度 · 洞察力满' },
  '射手':   { icon: '🏹', text: '木星扩张 · 远方召唤' },
  '摩羯':   { icon: '🐐', text: '土星规训 · 务实达成' },
  '水瓶':   { icon: '🌊', text: '天王创新 · 别树一帜' },
  '双鱼':   { icon: '🐟', text: '海王梦幻 · 直觉敏锐' }
}

const MBTI_LIST = [
  '❓ 不知道 / 没测过',
  'INTJ · 建筑师', 'INTP · 逻辑学家', 'ENTJ · 指挥官', 'ENTP · 辩论家',
  'INFJ · 提倡者', 'INFP · 调停者', 'ENFJ · 主人公', 'ENFP · 活动家',
  'ISTJ · 物流师', 'ISFJ · 守卫者', 'ESTJ · 总经理', 'ESFJ · 执政官',
  'ISTP · 鉴赏家', 'ISFP · 探险家', 'ESTP · 企业家', 'ESFP · 表演者'
]

const MBTI_READINGS = {
  '不知道': { icon: '🧬', text: '未定型人格 · 自由灵魂' },
  'INTJ': { icon: '♟️', text: 'Ni 洞见未来 · 战略家' },
  'INTP': { icon: '🔬', text: 'Ti 解构万象 · 逻辑师' },
  'ENTJ': { icon: '🎖️', text: 'Te 掌控全局 · 指挥官' },
  'ENTP': { icon: '💡', text: 'Ne 发散万象 · 辩论家' },
  'INFJ': { icon: '🕯️', text: 'Ni 共感未来 · 引路人' },
  'INFP': { icon: '🌸', text: 'Fi 内心理想 · 调停者' },
  'ENFJ': { icon: '🌟', text: 'Fe 共鸣他人 · 主人公' },
  'ENFP': { icon: '🎆', text: 'Ne 火花四溅 · 活动家' },
  'ISTJ': { icon: '📚', text: 'Si 经验稳健 · 检查员' },
  'ISFJ': { icon: '🛡️', text: 'Si 守护细节 · 守卫者' },
  'ESTJ': { icon: '📊', text: 'Te 秩序维护 · 总经理' },
  'ESFJ': { icon: '🤝', text: 'Fe 关怀社群 · 执政官' },
  'ISTP': { icon: '🔧', text: 'Ti 工具精通 · 鉴赏家' },
  'ISFP': { icon: '🎨', text: 'Fi 美感流露 · 探险家' },
  'ESTP': { icon: '⚡', text: 'Se 当下反应 · 企业家' },
  'ESFP': { icon: '🎭', text: 'Se 享乐当下 · 表演者' }
}

// 简化农历数据（mock，非精确计算）
const LUNAR_MOCK = {
  months: ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'],
  days: ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
         '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
         '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
}

// ========== Mock AI 推荐结果池 ==========
const MOCK_RESULTS = [
  {
    place_name: '三里屯太古里北区',
    distance_km: 3.2,
    transport: '地铁10号线 3站',
    suggested_duration_hour: 4,
    cost_per_person_rmb: '80-150',
    why: ['金星入庙审美元动，今日AQI 65正适合户外扫街', '水星顺行加持路途，3站地铁直达不换乘', '狮子座的太阳护体加持调性，大众点评4.8分300+打卡'],
    highlights: [{ name: '手冲咖啡盲测', tag: '三家精品咖啡店挨着喝，盲品有趣' }, { name: '胡同citywalk拍胶片', tag: '周边使馆区光影好出片' }],
    lunar_tip: '✨ 水星顺行第3日，迷路也会遇见对的店',
    energy_fit: '适合一般能量·半天'
  },
  {
    place_name: '什刹海后海北沿',
    distance_km: 5.8,
    transport: '地铁8号线 5站',
    suggested_duration_hour: 5,
    cost_per_person_rmb: '50-120',
    why: ['月亮入巨蟹护持情感场域，湖边步道适合放空', '木星扩张星象催远行，5站地铁直达什刹海', '银锭桥观日落是今日限定，过时不候'],
    highlights: [{ name: '后海划船看日落', tag: '夏末傍晚微风吹湖面，最佳时段' }, { name: '烟袋斜街淘老物件', tag: '周末限定市集有老北京兔爷' }],
    lunar_tip: '🌙 月亮入巨蟹，今日宜与老友重逢于烟火气之地',
    energy_fit: '适合满血能量·半天'
  },
  {
    place_name: '798艺术区D区',
    distance_km: 6.5,
    transport: '地铁14号线 4站',
    suggested_duration_hour: 3,
    cost_per_person_rmb: '40-100',
    why: ['天王创新星象加成，当代艺术展激发灵感', '土星规训让你不贪远，6.5km半天刚好', 'UCCA新展本周闭幕，时机稀缺正赶上'],
    highlights: [{ name: 'UCCA看新展', tag: '本周末最后一天，不看等明年' }, { name: '园区拍工业废墟风', tag: '包豪斯建筑+涂鸦墙出片率高' }],
    lunar_tip: '⭐ 金星入庙，美的东西会主动找上你',
    energy_fit: '适合一般能量·半天'
  },
  {
    place_name: '朝阳公园西门草坪',
    distance_km: 2.1,
    transport: '步行20分钟',
    suggested_duration_hour: 2,
    cost_per_person_rmb: '0-30',
    why: ['土象能量今日下沉，2km内不折腾最舒服', '太阳神护佑狮子座调性，草坪开阔显眼适合社交', 'AQI 65空气通透，户外活动正合适'],
    highlights: [{ name: '草坪野餐发呆', tag: '带块野餐布躺一下午，零成本快乐' }, { name: '湖边看人放风筝', tag: '周末限定风景，免费解压' }],
    lunar_tip: '🔮 木星与月亮成120°大三角，今天走出去的人都有好运',
    energy_fit: '适合低电量·1小时内'
  },
  {
    place_name: '五道营胡同',
    distance_km: 4.3,
    transport: '地铁2号线 4站',
    suggested_duration_hour: 3,
    cost_per_person_rmb: '60-120',
    why: ['海王梦幻星象加持，文艺小店适合慢逛拍照', '水星使者加持双子座好奇心，一条胡同10家店不重样', '大众点评4.7分，人少不挤体验好'],
    highlights: [{ name: '独立书店淘书', tag: '有几家只在周末开门的二手书店' }, { name: '手冲咖啡+甜品下午茶', tag: '胡同里藏着北京最好吃的抹茶蛋糕' }],
    lunar_tip: '✨ 水星顺行第3日，迷路也会遇见对的店',
    energy_fit: '适合一般能量·半天'
  }
]

// ========== 工具函数 ==========
function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekday(d) {
  return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
}

function getSeason(month) {
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}

// 简化农历计算（mock，非精确）
function getMockLunar(d) {
  const month = d.getMonth()
  const day = d.getDate()
  const lunarMonth = LUNAR_MOCK.months[month]
  // 粗略映射农历日（实际需要复杂算法）
  const lunarDayIdx = (day + 5) % 30
  const lunarDay = LUNAR_MOCK.days[lunarDayIdx]
  return {
    dateStr: `农历${lunarMonth}月${lunarDay}`,
    solarTerm: '',
    weekday: getWeekday(d),
    yi: ['出行', '会友'],
    ji: ['远行'],
    yiStr: '出行、会友',
    jiStr: '远行'
  }
}

function getConstellationKey(label) {
  if (label.includes('不知道')) return '不知道'
  // 从 "♈ 白羊座" 提取 "白羊"
  const match = label.match(/[\u4e00-\u9fa5]+/)
  return match ? match[0].replace('座', '') : '不知道'
}

function getMbtiKey(label) {
  if (label.includes('不知道')) return '不知道'
  return label.split(' ')[0].split('·')[0].trim()
}

function mapLink(keyword) {
  const city = '北京'
  const q = encodeURIComponent(keyword + ' ' + city)
  return `https://so.map.qq.com/?word=${q}`
}

// ========== Page ==========
Page({
  data: {
    // 阶段控制
    stage: 'form', // form | loading | result
    statusBarHeight: 20,

    // 环境信息
    locDesc: '北京 · 朝阳区',
    weather: { temp: 26, desc: '阴转多云' },
    dateTag: '',

    // 农历
    lunar: { dateStr: '', solarTerm: '', weekday: '', yi: [], ji: [], yiStr: '', jiStr: '' },
    dateInfoShow: true,

    // 日期
    minDate: '',
    maxDate: '',

    // 表单
    form: {
      date: '',
      dateDisplay: '',
      dateOffset: 0,
      duration: '半天',
      energy: '一般',
      preference: ['吃', '拍照']
    },

    // 选项
    durationOptions: DURATION_OPTIONS,
    energyOptions: ENERGY_OPTIONS,
    prefOptions: PREF_OPTIONS,
    dateQuick: DATE_QUICK,

    // 星座
    constellationLabels: CONSTELLATION_LIST,
    constellationIndex: 0,
    constellationReading: CONSTELLATION_READINGS['不知道'],

    // MBTI
    mbtiLabels: MBTI_LIST,
    mbtiIndex: 0,
    mbtiReading: MBTI_READINGS['不知道'],

    // 结果
    result: null,
    loading: false,

    // 海报
    showPoster: false,
    posterData: null
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight })
    const today = new Date()
    const todayStr = formatDate(today)
    const maxDate = formatDate(new Date(today.getTime() + 14 * 86400000))
    const lunar = getMockLunar(today)

    this.setData({
      minDate: todayStr,
      maxDate,
      form: {
        ...this.data.form,
        date: todayStr,
        dateDisplay: todayStr,
        dateOffset: 0
      },
      lunar,
      dateTag: `📅 ${lunar.weekday} · ${lunar.dateStr}`
    })

    // 恢复缓存
    this.restoreFromStorage()
  },

  restoreFromStorage() {
    const saved = wx.getStorageSync('todayForm') || {}
    if (saved.constellationIndex !== undefined) {
      const cKey = getConstellationKey(CONSTELLATION_LIST[saved.constellationIndex])
      this.setData({
        constellationIndex: saved.constellationIndex,
        constellationReading: CONSTELLATION_READINGS[cKey] || CONSTELLATION_READINGS['不知道']
      })
    }
    if (saved.mbtiIndex !== undefined) {
      const mKey = getMbtiKey(MBTI_LIST[saved.mbtiIndex])
      this.setData({
        mbtiIndex: saved.mbtiIndex,
        mbtiReading: MBTI_READINGS[mKey] || MBTI_READINGS['不知道']
      })
    }
  },

  // 日期选择
  onDateChange(e) {
    const dateStr = e.detail.value
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const offset = Math.round((d - today) / 86400000)
    const lunar = getMockLunar(d)
    this.setData({
      'form.date': dateStr,
      'form.dateDisplay': dateStr,
      'form.dateOffset': offset,
      lunar,
      dateTag: `📅 ${lunar.weekday} · ${lunar.dateStr}`
    })
  },

  onDateQuick(e) {
    const offset = e.currentTarget.dataset.offset
    const today = new Date()
    const target = new Date(today.getTime() + offset * 86400000)
    const dateStr = formatDate(target)
    const lunar = getMockLunar(target)
    this.setData({
      'form.date': dateStr,
      'form.dateDisplay': dateStr,
      'form.dateOffset': offset,
      lunar,
      dateTag: `📅 ${lunar.weekday} · ${lunar.dateStr}`
    })
  },

  // Chip 选择
  onChip(e) {
    const { group, val } = e.currentTarget.dataset
    if (group === 'duration') {
      this.setData({ 'form.duration': val })
    } else if (group === 'energy') {
      this.setData({ 'form.energy': val })
    } else if (group === 'preference') {
      let pref = [...this.data.form.preference]
      const idx = pref.indexOf(val)
      if (idx > -1) {
        pref.splice(idx, 1)
      } else {
        if (pref.length >= 2) {
          wx.showToast({ title: '最多选 2 个', icon: 'none' })
          return
        }
        pref.push(val)
      }
      this.setData({ 'form.preference': pref })
    }
  },

  // 星座选择
  onConstellationChange(e) {
    const idx = parseInt(e.detail.value)
    const label = CONSTELLATION_LIST[idx]
    const key = getConstellationKey(label)
    this.setData({
      constellationIndex: idx,
      constellationReading: CONSTELLATION_READINGS[key] || CONSTELLATION_READINGS['不知道']
    })
    this.saveToStorage()
  },

  // MBTI 选择
  onMbtiChange(e) {
    const idx = parseInt(e.detail.value)
    const label = MBTI_LIST[idx]
    const key = getMbtiKey(label)
    this.setData({
      mbtiIndex: idx,
      mbtiReading: MBTI_READINGS[key] || MBTI_READINGS['不知道']
    })
    this.saveToStorage()
  },

  saveToStorage() {
    wx.setStorageSync('todayForm', {
      constellationIndex: this.data.constellationIndex,
      mbtiIndex: this.data.mbtiIndex
    })
  },

  // 提交
  onSubmit() {
    const { form } = this.data
    if (!form.duration || !form.energy || form.preference.length === 0) {
      wx.showToast({ title: '请把 3 项都选一下', icon: 'none' })
      return
    }
    this.setData({ stage: 'loading' })

    // Mock AI 调用（实际应调用后端AI接口）
    setTimeout(() => {
      const result = this.generateMockResult()
      this.setData({ stage: 'result', result })
    }, 2000)
  },

  // 生成 mock 推荐结果
  generateMockResult() {
    const { form, constellationIndex, mbtiIndex } = this.data
    const cKey = getConstellationKey(CONSTELLATION_LIST[constellationIndex])
    const mKey = getMbtiKey(MBTI_LIST[mbtiIndex])

    // 根据条件选 mock 结果
    let pool = MOCK_RESULTS

    // 能量低 -> 近距离
    if (form.energy === '低电量') {
      pool = pool.filter(r => r.distance_km <= 3)
    }
    if (pool.length === 0) pool = MOCK_RESULTS

    // 随机选一个
    const result = pool[Math.floor(Math.random() * pool.length)]

    // 如果填了星座/MBTI，在 why 中加入性格契合
    let why = [...result.why]
    if (cKey !== '不知道' && CONSTELLATION_READINGS[cKey]) {
      why[2] = `${CONSTELLATION_READINGS[cKey].icon} ${cKey}座的守护星加持调性，${result.why[2].split('，')[1] || result.why[2]}`
    }
    if (mKey !== '不知道' && MBTI_READINGS[mKey]) {
      why[0] = `${MBTI_READINGS[mKey].icon} ${mKey}的${MBTI_READINGS[mKey].text.split(' · ')[0]}，${result.why[0].split('，')[1] || result.why[0]}`
    }

    return { ...result, why, highlights: result.highlights || [] }
  },

  // 重新选择
  onReselect() {
    this.setData({ stage: 'form' })
  },

  // 再抽一签
  onRegenerate() {
    this.setData({ stage: 'loading' })
    setTimeout(() => {
      const result = this.generateMockResult()
      this.setData({ stage: 'result', result })
    }, 2000)
  },

  // 点击地点名跳转腾讯地图
  onPlaceTap(e) {
    const name = e.currentTarget.dataset.name
    const url = mapLink(name)
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '搜索链接已复制，可在浏览器打开', icon: 'none', duration: 2000 })
      }
    })
  },

  onHighlightTap(e) {
    const name = e.currentTarget.dataset.name
    const place = e.currentTarget.dataset.place
    const url = mapLink(name + ' ' + place)
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '搜索链接已复制', icon: 'none', duration: 2000 })
      }
    })
  },

  // ========== 海报 ==========
  onOpenPoster() {
    const { result, form, lunar, constellationIndex, mbtiIndex } = this.data
    if (!result) return

    const cKey = getConstellationKey(CONSTELLATION_LIST[constellationIndex])
    const mKey = getMbtiKey(MBTI_LIST[mbtiIndex])

    // 构造 badge
    const tags = []
    if (mKey !== '不知道') tags.push(mKey)
    if (cKey !== '不知道') tags.push(cKey + '座')
    const badge = tags.length ? `✨ ${tags.join(' · ')} 今日限定` : '✨ AI 帮我选好了'

    const posterData = {
      date: `${lunar.weekday} · ${lunar.dateStr}`,
      badge,
      place: result.place_name,
      meta: [
        `📍 ${result.distance_km}km`,
        `🚕 ${result.transport}`,
        `⏱️ ${result.suggested_duration_hour}h`,
        `💰 ¥${result.cost_per_person_rmb}`
      ],
      why: result.why || [],
      highlights: result.highlights || [],
      lunarTip: result.lunar_tip || lunar.dateStr
    }

    this.setData({ showPoster: true, posterData })
  },

  onClosePoster() {
    this.setData({ showPoster: false })
  },

  onSavePoster() {
    wx.showToast({ title: '海报已保存到相册', icon: 'success' })
    // 实际应使用 canvas 截图保存
    // wx.canvasToTempFilePath + wx.saveImageToPhotosAlbum
  },

  onPullDownRefresh() {
    if (this.data.stage === 'form') {
      wx.stopPullDownRefresh()
    } else {
      this.setData({ stage: 'form' })
      wx.stopPullDownRefresh()
    }
  }
})
