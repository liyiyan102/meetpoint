# 碰面 MeetPoint — 分享卡片吸引力优化 PRD + UI + CodeBuddy 指令

> **版本**：V2.0（基于实际项目 `/Users/liyiyan/CodeBuddy/微信小程序/`）  
> **日期**：2026-04-16  
> **优先级**：P0  

---

## 一、现状审计

### 1.1 已完成的（不需要改）

| 模块 | 状态 | 说明 |
|:---|:---|:---|
| map.js `onShareAppMessage` | ✅ | 动态三级标题 + inviter/count/poi 参数 |
| join.js `onShareAppMessage` | ✅ | 动态三级标题 + 参数传递 |
| join.js `onLoad` 参数解析 | ✅ | 解析 inviter/count/poi |
| join.js `_loadMeetingInfo` | ✅ | 服务端数据覆盖 URL 参数 |
| join.js `_calcTimeAgo` | ✅ | 时间差计算 |
| join.wxml 地点卡片 | ✅ | `poi-card-mini` 条件展示 |
| join.wxml 成功弹层 | ✅ | `showJoinSuccessModal` + 邀请/进入按钮 |
| join.wxss 全套样式 | ✅ | 地点卡片 + 弹层样式完整 |
| 27 个 SVG 图标 | ✅ | 蓝色图标库完整（含 icon-camera/icon-explore） |

### 1.2 待优化的（本次变更范围）

| # | 模块 | 现状问题 | 优化方案 |
|:---|:---|:---|:---|
| **1** | map.js `onShareAppMessage` | `imageUrl: ''`（无封面图） | 新增 Canvas 动态封面生成 |
| **2** | join.wxml 信息卡片 | 碰头编号过于技术化，缺少参与人头像 | 改为以人为核心的卡片（头像组 + 发起人 + 人数） |
| **3** | join.wxml 成功弹层 | 激励文案固定，缺少人数差异化 | 根据当前人数动态显示不同激励文案 |
| **4** | join.wxml 主标题 | 固定「你收到了碰头邀请」 | 改为动态 `{发起人}邀请你碰头` |
| **5** | join.wxml CTA 按钮 | 纯文字「加入碰头」 | 加蓝色图标增强视觉引导 |

---

## 二、视觉 UI 设计

### 2.1 优化后的加入页布局

```
┌────────────────────────────────────┐
│         (状态栏 + 安全区)           │
│                                    │
│           ┌────────┐               │
│           │ 品牌蓝  │               │  ← 圆形渐变品牌图标
│           │ 碰面icon│               │
│           └────────┘               │
│                                    │
│       小明邀请你碰头                │  ← 动态主标题
│                                    │
│   ┌──────────────────────────┐     │
│   │ 📍 三里屯太古里 · 距你3km │     │  ← 地点卡片（有地点时）
│   └──────────────────────────┘     │
│                                    │
│   路线已规划好，加入后一键导航      │  ← 动态副标题
│                                    │
│   ┌──────────────────────────────┐ │
│   │                              │ │
│   │  ┌──┐ ┌──┐ ┌──┐  ← 头像组   │ │  ← 新增：参与人头像
│   │  └──┘ └──┘ └──┘             │ │
│   │                              │ │
│   │  发起人    小明               │ │
│   │  已参与    3 人               │ │
│   │  发起时间  10分钟前           │ │  ← 新增：时间信息
│   │                              │ │
│   └──────────────────────────────┘ │
│                                    │
│   ┌──────────────────────────────┐ │
│   │  先设置一下你的信息           │ │  ← 条件展示
│   │  [头像] [输入昵称]           │ │
│   └──────────────────────────────┘ │
│                                    │
│   ╔══════════════════════════════╗ │
│   ║    📍  加入碰头               ║ │  ← 带图标的 CTA
│   ╚══════════════════════════════╝ │
│                                    │
│   加入后需授权定位 · 10分钟前发起   │
│                                    │
└────────────────────────────────────┘
```

### 2.2 加入成功弹层布局

```
┌──────────────────────────────┐
│                              │
│         ┌──────┐             │
│         │蓝圆底│             │  ← 品牌渐变圆
│         │碰面ic│             │
│         └──────┘             │
│                              │
│       加入成功！              │
│                              │
│  你是第 4 位加入的朋友        │  ← 动态激励文案
│  再邀请 1 人推荐更精准        │
│                              │
│  ┌──────────┐ ┌──────────┐  │
│  │ 邀请好友  │ │ 进入碰面  │  │
│  └──────────┘ └──────────┘  │
│                              │
└──────────────────────────────┘
```

### 2.3 分享卡片封面（Canvas 动态生成）

```
┌─────────────────────────────────┐
│                                 │
│  蓝色渐变背景 #EBF2FF → #D4E4FF │
│                                 │
│           ┌──────┐              │
│           │ 品牌  │  ← 蓝色圆 + 白色定位图标
│           │ 图标  │              │
│           └──────┘              │
│                                 │
│     ┌──┐ ┌──┐ ┌──┐             │
│     │头│ │头│ │头│  ← 参与人首字头像
│     └──┘ └──┘ └──┘             │
│                                 │
│     「三里屯太古里」             │  ← 地点名（加粗 26px）
│     3人已加入 · 等你来           │  ← 人数（灰色 18px）
│                                 │
│  ─────────────────────────────  │
│     碰面 MeetPoint              │  ← 品牌标识
│                                 │
└─────────────────────────────────┘

规格：500×400px（5:4），微信分享卡片推荐比例
```

---

## 三、代码变更清单

### 3.1 需要新增的素材

无需新增，全部复用已有 `images/icons/` 下的 SVG。

### 3.2 需要修改的文件（4 个）

| 文件 | 变更内容 |
|:---|:---|
| `pages/join/join.wxml` | ① 主标题动态化 ② 信息卡片加头像组+时间 ③ CTA 按钮加图标 ④ 成功弹层加动态文案 |
| `pages/join/join.js` | ① 新增 memberAvatarList 构建 ② 新增 getIncentiveText 方法 ③ 成功弹层传入动态文案 |
| `pages/join/join.wxss` | ① 新增头像组样式 ② 优化信息卡片布局 |
| `pages/map/map.js` | ① 新增 `_generateShareImage` Canvas 方法 ② 触发时机绑定 ③ `imageUrl` 使用生成路径 |

---

## 四、CodeBuddy 可直接执行的指令

### 指令 1：修改 join.wxml — 信息卡片升级 + 动态标题 + CTA 图标

```
修改文件 /Users/liyiyan/CodeBuddy/微信小程序/pages/join/join.wxml

1. 将第 10 行主标题从固定文案改为动态：
   修改前：<view class="join-title">你收到了碰头邀请</view>
   修改后：<view class="join-title">{{creatorName ? creatorName + '邀请你碰头' : '你收到了碰头邀请'}}</view>

2. 在信息卡片（invite-card）中，在碰头编号行之前新增参与人头像组：
   <view class="invite-avatars" wx:if="{{memberAvatarList.length > 0}}">
     <view class="invite-avatar" wx:for="{{memberAvatarList}}" wx:key="index" wx:if="{{index < 5}}" style="margin-left:{{index === 0 ? '0' : '-16rpx'}};z-index:{{10-index}}">
       <image wx:if="{{item.url}}" class="invite-avatar-img" src="{{item.url}}" mode="aspectFill"></image>
       <text wx:else class="invite-avatar-text">{{item.text}}</text>
     </view>
     <view class="invite-avatar invite-avatar-more" wx:if="{{memberCount > 5}}" style="margin-left:-16rpx">
       <text>+{{memberCount - 5}}</text>
     </view>
   </view>

3. 在"已有成员"行后新增时间行（如果 timeAgo 存在）：
   <view class="invite-row" wx:if="{{timeAgo}}">
     <text class="invite-label">发起时间</text>
     <text class="invite-name">{{timeAgo}}</text>
   </view>

4. CTA 按钮加图标：
   修改前：<button class="btn-primary btn-join" bindtap="onJoin">加入碰头</button>
   修改后：<button class="btn-primary btn-join" bindtap="onJoin"><image class="btn-icon-inline" src="/images/icons/icon-pin.svg" mode="aspectFit"></image> 加入碰头</button>

5. 成功弹层描述改为动态文案：
   修改前：<view class="modal-desc">你已加入碰头，可以邀请更多好友一起</view>
   修改后：<view class="modal-desc">{{incentiveText}}</view>
```

### 指令 2：修改 join.js — 构建头像列表 + 激励文案

```
修改文件 /Users/liyiyan/CodeBuddy/微信小程序/pages/join/join.js

1. 在 data 中新增字段：
   memberAvatarList: [],
   incentiveText: ''

2. 在 _loadMeetingInfo 方法中，获取到 meeting 后构建头像列表：
   // 构建参与人头像列表
   const memberAvatarList = meeting.members.map(m => ({
     text: (m.nickname || '?').charAt(0),
     url: m.avatarUrl || ''
   }));
   updateData.memberAvatarList = memberAvatarList;

3. 新增 _getIncentiveText 方法（在 _calcTimeAgo 后面）：
   _getIncentiveText(count) {
     if (count <= 2) {
       return '你是第' + count + '位加入的朋友\n再邀请1人即可解锁智能碰面推荐';
     } else if (count <= 4) {
       return '你是第' + count + '位加入的朋友\n人越多推荐越精准，再拉几个朋友吧';
     } else {
       return '碰面人气很旺！\n快进入碰面查看大家的路线';
     }
   },

4. 在 onJoin 成功分支中，showJoinSuccessModal 设为 true 之前计算激励文案：
   const newCount = (this.data.memberCount || 0) + 1;
   this.setData({
     showJoinSuccessModal: true,
     incentiveText: this._getIncentiveText(newCount),
     loading: false
   });
```

### 指令 3：修改 join.wxss — 新增头像组 + 按钮图标样式

```
在文件 /Users/liyiyan/CodeBuddy/微信小程序/pages/join/join.wxss 末尾追加：

/* ---- 参与人头像组 ---- */
.invite-avatars {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0 20rpx;
}
.invite-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  background: #EBF2FF;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
  position: relative;
}
.invite-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.invite-avatar-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--c-primary);
}
.invite-avatar-more {
  background: var(--c-primary-bg);
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-primary);
}

/* ---- CTA 按钮内图标 ---- */
.btn-icon-inline {
  width: 32rpx;
  height: 32rpx;
  vertical-align: middle;
  margin-right: 8rpx;
  /* 白色滤镜让蓝色 SVG 在蓝底白字按钮上可见 */
}
```

### 指令 4：修改 map.js — 新增 Canvas 分享封面生成

```
修改文件 /Users/liyiyan/CodeBuddy/微信小程序/pages/map/map.js

1. 在 onShareAppMessage 方法中，将 imageUrl 从空字符串改为：
   imageUrl: this._shareImageUrl || ''

2. 在 _showToast 方法之后、文件末尾的 }); 之前，新增 _generateShareImage 方法：

   _generateShareImage() {
     const query = wx.createSelectorQuery();
     query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
       if (!res || !res[0]) return;
       const canvas = res[0].node;
       const ctx = canvas.getContext('2d');
       const dpr = wx.getWindowInfo().pixelRatio || 2;
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
       const meeting = this.data.meeting;
       const members = meeting ? meeting.members : [];
       const colors = ['#4A7FE5', '#FF6B6B', '#FFB347', '#2ECC71', '#9B59B6'];
       const count = Math.min(members.length, 5);
       const startX = 250 - (count * 22);
       for (let i = 0; i < count; i++) {
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
       const poiText = (meeting && meeting.meetPoint) ? meeting.meetPoint.name : '等你来选碰面点';
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
       const self = this;
       wx.canvasToTempFilePath({
         canvas: canvas,
         success: function(imgRes) { self._shareImageUrl = imgRes.tempFilePath; }
       });
     });
   },

   // 辅助方法：获取当前碰头数据
   _getMeeting() {
     return meetingMgr.getMeeting(this.data.meetingId);
   },

3. 在 map.wxml 最底部（</view> 之前）添加隐藏 Canvas：
   <canvas type="2d" id="shareCanvas" style="width:500px;height:400px;position:fixed;left:-9999px;top:-9999px"></canvas>

4. 在 map.js 中以下位置触发封面生成：
   a. onReady 方法末尾添加：this._generateShareImage();
   b. onSetMeetPoint 方法的 this._showToast('已设置碰头地点'); 后添加：this._generateShareImage();
```

### 指令 5：验证 — Emoji 残留检查

```
在 /Users/liyiyan/CodeBuddy/微信小程序/pages/ 目录下全局搜索以下字符：
🧑 👩 🧔 📍 ⚠️ 🔍 🤝 ☕ 🍜 🌳 🚇 🏬 🏙️ ⭐ 📞 🧭 🗑

应返回 0 结果。
注意：map.js 测试工具中的 emoji（😀 😎 🤠 🧐 🤩 😊）属于模拟用户数据，不替换。
```

### 指令 6：编译预览 — 完整场景测试

```
在微信开发者工具中编译，测试以下场景：

1. 首页 → 头像角标显示蓝色相机图标
2. 创建碰头 → 进入地图 → 等 1 秒（Canvas 生成） → 分享
   → 分享卡片有蓝色渐变封面图 + 品牌标识
   → 标题包含人数信息
3. 设置碰头地点 → 再次分享
   → 标题包含地点名
   → 封面图文字更新为地点名
4. 通过分享链接进入 join 页
   → 标题显示「{发起人}邀请你碰头」（非固定文案）
   → 地点卡片展示蓝色圆角背景
   → 信息卡片展示参与人头像组
   → 信息卡片展示发起时间
5. 点击「加入碰头」
   → 弹出成功引导弹层
   → 弹层描述为动态文案（含人数差异化）
6. 弹层 → 点击「邀请好友」→ 触发微信分享，标题为动态文案
7. 弹层 → 点击「进入碰面」→ 跳转地图页
```

---

## 五、预期效果对比

| 指标 | 优化前 | 优化后 |
|:---|:---|:---|
| 分享卡片封面 | 无图（灰色默认） | 蓝色品牌封面 + 头像 + 地点 |
| 分享标题 | join 页：静态「邀请你碰面」 | 动态三级策略（已完成） |
| 加入页信息密度 | 碰头编号 + 发起人 + 人数 | + 头像组 + 时间 + 地点卡片 |
| 加入成功弹层 | 固定文案 | 人数差异化激励 |
| CTA 按钮 | 纯文字 | 图标 + 文字 |
| 预期点击率提升 | 基线 | **+50%~100%** |

---

## 六、完成标记

- [x] 需求分析 & 现状审计
- [x] 视觉 UI 设计（加入页 + 弹层 + 封面）
- [x] 素材：icon-camera.svg / icon-explore.svg 已导出
- [x] CodeBuddy 指令 6 条
- [ ] 指令 1-4 执行
- [ ] 指令 5-6 验证
