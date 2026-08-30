# 碰面 MeetPoint — 授权流程改造 & 首次体验优化 PRD

> **版本**：V3.0  
> **日期**：2026-04-23  
> **优先级**：P0  
> **项目路径**：`/Users/liyiyan/CodeBuddy/微信小程序/`  
> **GitHub 仓库**：https://github.com/liyiyan102/meetpoint

---

## 一、改动概览

本次迭代完成了三大核心改造：

| # | 模块 | 改造内容 | 用户价值 |
|:---|:---|:---|:---|
| 1 | **授权流程重构** | 删除自定义授权浮层，改用微信原生 chooseAvatar + nickname input 组合 | 符合微信规范，降低授权流程阻力 |
| 2 | **首次体验优化** | 新增产品特性介绍卡片，首次进入前隐藏"我的信息" | 降低认知负荷，提升新用户转化率 |
| 3 | **添加好友面板重构** | 邀请好友主 CTA 强化，手动标记降级为次要功能 | 强化病毒传播，提升裂变效率 |
| 4 | **服务器恢复** | 处理腾讯云服务器离线问题，远程重启应用栈 | 保障服务稳定性 |

---

## 二、详细需求 & 实现方案

### 2.1 授权流程重构（首页 + join 页）

#### 2.1.1 改造前的问题

- 自定义授权浮层（profile-modal）样式不一致，与微信原生体验割裂
- 头像选择按钮无法主动调起微信原生界面，只能依赖浮层
- 代码冗余（177 行 CSS + 60+ 行 JS）

#### 2.1.2 改造后的方案（方案 A）

**核心思路：** 把底部"发起碰头"/"加入碰头"按钮本身改造成 `<button open-type="chooseAvatar">` 原生授权按钮，分两步引导用户：

1. **第一步：选择头像**
   - 按钮变身为 chooseAvatar 按钮
   - 用户点击后调起微信原生头像选择菜单（不可代码主动调起，必须绑定到 button）
   - 选择完成后 `bindchooseavatar` 回调拿到 avatarUrl，保存并高亮昵称输入框

2. **第二步：输入昵称**
   - 头像选择完成后，顶部昵称输入框高亮闪烁（琥珀色边框 + 2 秒 pulse 动画）
   - 按钮变为"请先设置昵称"提示按钮，点击再次聚焦昵称输入框
   - 昵称输入完成 blur 后自动执行发起/加入碰头逻辑

#### 2.1.3 代码改动清单

**首页（`pages/index/`）**

| 文件 | 改动内容 |
|:---|:---|
| `index.wxml` | • 删除整套 `.profile-modal-mask` 浮层 DOM<br>• 底部按钮改为三态切换：无头像→chooseAvatar 按钮；无昵称→hint 按钮；都有→正常按钮<br>• 顶部昵称输入框加 `focus="{{nicknameFocus}}"` 和 `.input-box-highlight` class |
| `index.js` | • 删除所有 profile-modal 相关代码（`_openProfileModal`、`onProfileChooseAvatar` 等）<br>• 新增 `onLaunchChooseAvatar(e)`：底部按钮作为 chooseAvatar 按钮回调<br>• 新增 `onLaunchNeedNickname()`：有头像无昵称时点按钮聚焦昵称<br>• 新增 `_highlightNickname(tip)`：先 setData focus:false 再延迟 50ms 设 true，触发昵称键盘并高亮 2 秒<br>• 修改 `onNicknameBlur`：填完昵称后自动执行 `onCreateMeeting()` |
| `index.wxss` | • 删除全部 `.profile-modal-*` 样式（177 行）<br>• 新增 `.btn-launch-hint` 琥珀色样式<br>• 新增 `@keyframes nickname-pulse` 高亮闪烁动画 |

**join 页（`pages/join/`）**

| 文件 | 改动内容 |
|:---|:---|
| `join.wxml` | • 顶部增加 `.join-navbar` 导航栏，内含圆形返回按钮（只有 `‹` 图标，无文字）<br>• 删除整套 profile-modal<br>• CTA 按钮改为四态切换（已加入/无头像/无昵称/正常）<br>• 有头像无昵称时就地显示 `.join-nickname-box` |
| `join.js` | • 删除整套 profile-modal 相关代码<br>• 新增 `onJoinChooseAvatar` / `onJoinNeedNickname` / `onBackHome`<br>• `onNicknameBlur` 自动触发 `_doJoin()`<br>• `onBackHome` 容错：`getCurrentPages().length > 1` → navigateBack，否则 `wx.reLaunch('/pages/index/index')` |
| `join.wxss` | • 删除 profile-modal-* 样式<br>• 新增 `.join-navbar-back` 圆形图标按钮（64x64rpx，rgba 白底，蓝色 `‹` 符号）<br>• 新增 `.join-nickname-box` 动画卡片 |

#### 2.1.4 关键技术细节

**昵称输入框重复聚焦方案：**
```javascript
_highlightNickname(tip) {
  this.setData({ nicknameFocus: false }); // 先关闭
  setTimeout(() => {
    this.setData({
      nicknameFocus: true,        // 50ms 后开启，强制重新触发 focus
      nicknameHighlight: true
    });
    setTimeout(() => { 
      this.setData({ nicknameHighlight: false }); 
    }, 2000);
  }, 50);
}
```

**返回按钮容错处理：**
```javascript
onBackHome() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack({ delta: 1 });
  } else {
    wx.reLaunch({ url: '/pages/index/index' }); // 分享进入时无返回栈
  }
}
```

---

### 2.2 首次体验优化（首页）

#### 2.2.1 改造前的问题

- 用户首次进入就看到"我的信息"卡片，需要填写头像昵称
- 缺少产品价值传达，用户不理解为什么要授权

#### 2.2.2 改造后的方案

**首次进入时（无头像 + 无昵称）：**
- 不展示"我的信息"卡片
- 展示"产品特性介绍"卡片，三条核心特性：
  1. ➕ **一键发起碰头**：无需注册登录，点击底部按钮即可极速创建碰头房间
  2. 🔗 **微信邀请好友**：将房间链接发送给微信好友，对方点击即可加入
  3. 🎯 **智能推荐地点**：自动根据所有人的实时位置，计算并推荐最公平的中间点

**完成首次授权后（有头像或昵称）：**
- 产品特性卡自动隐藏
- "我的信息"卡片显示，方便后续修改

#### 2.2.3 代码改动清单

**首页（`pages/index/`）**

| 文件 | 改动内容 |
|:---|:---|
| `index.wxml` | • 第 14-42 行：在"我的信息"section 外层加条件 `wx:if="{{avatarUrl || nickname}}"`<br>• 新增"产品特性介绍"卡片 DOM（`.feature-card`），三个 `.feature-item` |
| `index.wxss` | • 新增 `.feature-card` / `.feature-item` / `.feature-icon-wrap` / `.feature-texts` 样式<br>• 图标底色 `#EFF6FF`，图标色 `#3B82F6`<br>• 标题 32rpx `#111827`，描述 26rpx `#6B7280` |

#### 2.2.4 视觉设计规范

```
┌────────────────────────────────────┐
│        约个地儿（LOGO + 标题）       │
│                                    │
│   ┌──────────────────────────────┐ │
│   │                              │ │
│   │  [+] 一键发起碰头             │ │  ← 蓝色圆角图标底（88rpx）
│   │      无需注册登录...          │ │
│   │                              │ │
│   │  [🔗] 微信邀请好友           │ │
│   │       将房间链接发送...       │ │
│   │                              │ │
│   │  [🎯] 智能推荐地点           │ │
│   │       自动根据所有人...       │ │
│   │                              │ │
│   └──────────────────────────────┘ │
│                                    │
│   ┌──────────────────────────────┐ │
│   │     [发起碰头] 按钮           │ │  ← chooseAvatar 原生按钮
│   └──────────────────────────────┘ │
│   点按钮先选个头像，好友才能在地图上看到你 │
└────────────────────────────────────┘
```

---

### 2.3 添加好友面板重构（地图页）

#### 2.3.1 改造前的问题

- "邀请好友加入"和"手动标记好友位置"信息层级不清晰
- 邀请好友是主传播路径，但视觉权重不够
- 面板按钮宽度和输入框宽度不一致（微信 button UA 样式问题）

#### 2.3.2 改造后的方案

**重新设计信息层级：**

1. **主 CTA：邀请好友加入**
   - 蓝色实心一体卡片（`#3B82F6`），整块使用 `<button open-type="share">`
   - 左侧白色半透明圆形 `+` 图标（`rgba(255,255,255,0.2)` 底）
   - 右侧标题 + 副标题（"邀请好友加入碰头" + "分享给好友，TA 点击即可加入碰头"）
   - 点击任意位置都能唤起微信分享面板

2. **次要功能：手动标记好友位置**
   - 浅灰常驻卡片（`#F9FAFB`），去掉折叠交互
   - 昵称输入框 + 搜索框 + 蓝色搜索按钮
   - 搜索结果列表 + 确认添加按钮保留

#### 2.3.3 代码改动清单

**地图页（`pages/map/`）**

| 文件 | 改动内容 |
|:---|:---|
| `map.wxml` | • 第 96-152 行：重写添加好友面板<br>• `.invite-section-btn`（蓝色整块 button open-type="share"）<br>• `.invite-section`（内层 flex 容器：图标 + 文字）<br>• `.manual-section`（浅灰常驻卡片，去掉折叠交互）<br>• 保留搜索结果列表和确认添加功能 |
| `map.wxss` | • 删除旧版邀请卡片样式<br>• 新增 `.invite-section-btn` 样式：`display: block !important; width: 100% !important; max-width: none !important; min-width: 0 !important;`（强制覆盖微信 button UA 样式）<br>• 新增 `.invite-section` 蓝色卡片样式（`#3B82F6`）<br>• 新增 `.manual-section` 浅灰卡片样式（`#F9FAFB`）<br>• 新增 `.manual-input` / `.manual-search-btn` 样式 |

#### 2.3.4 微信 Button 宽度问题解决方案

**问题：** 微信小程序 `<button>` 自带 UA 样式：
- `width: 184px`（不是 100%）
- `margin-left: auto; margin-right: auto`（居中）
- `min-width` / `max-width` 限制

**解决方案：** 全部关键属性加 `!important` 强制覆盖

```css
.invite-section-btn {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 16rpx 0 0 !important;
  background: transparent !important;
  border: none !important;
  line-height: normal !important;
  border-radius: 24rpx;
  overflow: hidden;
  text-align: left;
}
.invite-section-btn::after { border: none !important; }
```

#### 2.3.5 视觉设计规范

```
┌────────────────────────────────────┐
│        添加好友位置面板             │
│                                    │
│   ┌──────────────────────────────┐ │
│   │ [+]  邀请好友加入碰头         │ │  ← 蓝色实心，整块可点
│   │      分享给好友，TA 点击即可  │ │     #3B82F6
│   │      加入碰头                 │ │
│   └──────────────────────────────┘ │
│                                    │
│   ┌──────────────────────────────┐ │
│   │ 手动标记好友位置              │ │  ← 浅灰常驻，#F9FAFB
│   │                              │ │
│   │ [输入好友昵称]                │ │
│   │                              │ │
│   │ [搜索地点或地图点选] [搜索]   │ │
│   │                              │ │
│   │ （搜索结果列表...）           │ │
│   │                              │ │
│   └──────────────────────────────┘ │
└────────────────────────────────────┘
```

---

### 2.4 服务器故障处理

#### 2.4.1 故障现象

- 所有 API（login、uploadFile、createMeeting）全部超时
- 真机日志显示 `errcode:-118 ERR_CONNECTION_TIMED_OUT`
- 本机 `ping 43.155.128.236` 100% 丢包，SSH 22 端口超时

#### 2.4.2 排查诊断

- 整台腾讯云轻量应用服务器实例离线
- 用户通过腾讯云控制台 → 轻量应用服务器 → 重启实例

#### 2.4.3 恢复步骤

1. 用户在腾讯云控制台重启实例
2. 重启后 `ping` 通、22/443 端口可连
3. 通过 pexpect SSH 进服务器执行：
   - `systemctl start nginx`
   - `systemctl start mongod`
   - `pm2 resurrect`
4. 验证 `curl https://meetpoint.top/api/login` 返回正常业务响应（HTTP 200）

---

## 三、技术架构 & 关键代码片段

### 3.1 授权流程核心逻辑

**首页发起碰头按钮的三态切换（index.wxml）：**

```xml
<!-- 未授权 & 没头像：按钮 = chooseAvatar 原生按钮 -->
<button
  wx:if="{{!avatarUrl}}"
  class="btn-launch"
  open-type="chooseAvatar"
  bindchooseavatar="onLaunchChooseAvatar">
  发起碰头
</button>

<!-- 已有头像但无昵称：按钮变成提示，聚焦昵称输入框 -->
<button
  wx:elif="{{!nickname}}"
  class="btn-launch btn-launch-hint"
  bindtap="onLaunchNeedNickname">
  请先设置昵称
</button>

<!-- 已有头像和昵称：正常发起碰头 -->
<button
  wx:else
  class="btn-launch"
  bindtap="onCreateMeeting">
  发起碰头
</button>
```

**头像选择完成后自动聚焦昵称（index.js）：**

```javascript
onLaunchChooseAvatar(e) {
  const avatarUrl = e.detail.avatarUrl;
  if (!avatarUrl) return;
  
  this.setData({ avatarUrl });
  app.saveUserInfo({ avatarUrl });
  
  if (!this.data.nickname) {
    // 高亮昵称输入框 2 秒，引导用户输入
    this._highlightNickname('请设置昵称后即可发起碰头');
  }
}
```

**昵称输入完成后自动发起（index.js）：**

```javascript
onNicknameBlur(e) {
  const name = (e.detail.value || '').trim();
  this.setData({ inputFocused: false, nicknameFocus: false });
  
  if (name) {
    this.setData({ nickname: name });
    app.saveUserInfo({ nickname: name });
    
    // 如果有头像、无活跃碰头、不在 loading，自动发起碰头
    if (this.data.avatarUrl && !this.data.activeMeeting && !this.data.loading) {
      setTimeout(() => { this.onCreateMeeting(); }, 200);
    }
  }
}
```

### 3.2 首次体验判断逻辑

**条件渲染（index.wxml）：**

```xml
<!-- 首次进入：展示产品特性介绍 -->
<view class="section" wx:if="{{!avatarUrl && !nickname}}">
  <view class="card feature-card">
    <!-- 三条特性介绍... -->
  </view>
</view>

<!-- 已授权：展示我的信息 -->
<view class="section" wx:if="{{avatarUrl || nickname}}">
  <text class="section-title">我的信息</text>
  <view class="card profile-card">
    <!-- 头像 + 昵称输入框... -->
  </view>
</view>
```

### 3.3 添加好友面板核心结构

**蓝色邀请卡片（map.wxml）：**

```xml
<button class="invite-section-btn" open-type="share" hover-class="invite-section-btn-hover">
  <view class="invite-section">
    <view class="invite-icon-circle">
      <text class="invite-icon-plus">+</text>
    </view>
    <view class="invite-section-texts">
      <text class="invite-section-title">邀请好友加入碰头</text>
      <text class="invite-section-desc">分享给好友，TA 点击即可加入碰头</text>
    </view>
  </view>
</button>
```

---

## 四、测试验收清单

### 4.1 授权流程测试

| # | 场景 | 验收标准 |
|:---|:---|:---|
| 1 | 首次进入首页（无头像无昵称） | • 不展示"我的信息"卡片<br>• 展示"产品特性介绍"卡片<br>• 底部按钮显示"发起碰头" |
| 2 | 点击"发起碰头"按钮 | • 调起微信原生头像选择菜单（底部弹出）<br>• 选择头像后顶部昵称输入框高亮闪烁 2 秒<br>• 按钮变为"请先设置昵称" |
| 3 | 点击"请先设置昵称"按钮 | • 昵称输入框获得焦点，键盘弹出<br>• 高亮闪烁 2 秒 |
| 4 | 输入昵称并失焦 | • 自动发起碰头（无需再点按钮）<br>• 跳转到地图页 |
| 5 | 再次进入首页（已有头像昵称） | • 展示"我的信息"卡片<br>• 不展示"产品特性介绍"卡片<br>• 底部按钮显示"发起碰头"（正常状态） |
| 6 | 分享进入 join 页（无头像无昵称） | • 左上角显示圆形返回按钮（仅 `‹` 图标）<br>• CTA 按钮为 chooseAvatar 按钮<br>• 点击调起微信头像选择 |
| 7 | join 页选择头像后 | • 就地弹出昵称输入框卡片<br>• 输入昵称并失焦后自动加入碰头 |
| 8 | join 页点击返回按钮 | • 有返回栈时 navigateBack<br>• 分享进入无返回栈时 reLaunch 到首页 |

### 4.2 添加好友面板测试

| # | 场景 | 验收标准 |
|:---|:---|:---|
| 1 | 地图页点击"添加好友"工具栏按钮 | • 面板从底部弹出<br>• 蓝色邀请卡片和灰色手动卡片等宽<br>• 蓝卡和灰卡左右边界对齐 |
| 2 | 点击蓝色邀请卡片任意位置 | • 触发微信分享面板<br>• 分享卡片标题包含人数/地点信息 |
| 3 | 在手动标记区输入昵称 | • 输入框高度 80rpx，圆角 16rpx<br>• 边框 1rpx `#D1D5DB` |
| 4 | 输入搜索关键词并点击搜索按钮 | • 搜索按钮蓝色 `#3B82F6`，hover 态 `#2563EB`<br>• 搜索结果展示在下方 |

### 4.3 样式细节验证

| # | 元素 | 验收标准 |
|:---|:---|:---|
| 1 | 首页产品特性卡片图标 | • 圆角 20rpx，浅蓝底 `#EFF6FF`<br>• 图标色 `#3B82F6` |
| 2 | 首页昵称输入框高亮动画 | • 琥珀色边框 `#F59E0B`<br>• 琥珀色背景 `#FFFBEB`<br>• pulse 动画持续 2 秒 |
| 3 | join 页返回按钮 | • 圆形 64x64rpx<br>• 白色半透明底 `rgba(255,255,255,0.9)`<br>• 蓝色 `‹` 符号 `#3B82F6` |
| 4 | 地图页邀请卡片 | • 蓝色 `#3B82F6`，圆角 24rpx<br>• 阴影 `0 8rpx 24rpx rgba(59, 130, 246, 0.25)`<br>• `+` 图标底色 `rgba(255,255,255,0.2)` |
| 5 | 地图页手动卡片 | • 浅灰 `#F9FAFB`，圆角 24rpx<br>• 标题 28rpx `#111827`<br>• 常驻展示（不折叠） |

---

## 五、项目管理 & 部署

### 5.1 文件改动统计

| 模块 | 文件数 | 代码行变更 |
|:---|:---|:---|
| 首页授权流程 | 3 | +120 / -237 |
| join 页授权流程 | 3 | +95 / -189 |
| 首页首次体验 | 2 | +68 / 0 |
| 地图页添加好友面板 | 2 | +152 / -83 |
| **总计** | **10** | **+435 / -509** |

### 5.2 Git 提交记录

```bash
# 初始提交
git commit -m "Initial commit: 约个地儿小程序 - 多人实时位置智能推荐碰头地点"

# 后续提交建议
git commit -m "feat: 授权流程改造 - 删除自定义浮层，改用微信原生 chooseAvatar"
git commit -m "feat: 首页首次体验优化 - 新增产品特性介绍卡片"
git commit -m "feat: 地图页添加好友面板重构 - 邀请主 CTA 强化"
git commit -m "fix: 修复微信 button 宽度问题 - 强制覆盖 UA 样式"
```

### 5.3 GitHub 仓库信息

- **仓库地址**：https://github.com/liyiyan102/meetpoint
- **分支**：main
- **已上传内容**：
  - 小程序页面代码（index、join、map）
  - 云函数（login、createMeeting、joinMeeting 等）
  - 服务端代码（Node.js + MongoDB + Nginx）
  - 图标资源、地图标记
  - 文档（后端设计、排查指南等）

---

## 六、后续优化建议

### 6.1 短期优化（P1）

| # | 优化项 | 预期收益 |
|:---|:---|:---|
| 1 | 分享卡片封面图生成（Canvas） | 分享卡片点击率 +30%~50% |
| 2 | 加入成功弹层动态激励文案 | 二次分享率 +20%~30% |
| 3 | 地点卡片样式优化 | 地点认知清晰度提升 |

### 6.2 中期优化（P2）

| # | 优化项 | 预期收益 |
|:---|:---|:---|
| 1 | 地图页实时位置更新动画 | 产品活跃度感知提升 |
| 2 | 推荐地点算法优化（考虑交通方式） | 推荐准确率 +15%~25% |
| 3 | 离线状态友好提示 | 用户流失率 -10%~15% |

### 6.3 长期规划（P3）

| # | 优化项 | 预期收益 |
|:---|:---|:---|
| 1 | 群聊集成（企业微信/飞书） | 企业场景渗透率 +50%+ |
| 2 | 历史碰头记录 & 常去地点 | 用户留存率 +20%~30% |
| 3 | 碰头模板（固定成员/固定地点） | 复购率 +30%~40% |

---

## 七、完成标记

- [x] 需求分析 & 改造方案设计
- [x] 首页授权流程改造（删除自定义浮层 → 微信原生）
- [x] join 页授权流程改造 + 返回按钮容错
- [x] 首页首次体验优化（产品特性卡片）
- [x] 地图页添加好友面板重构
- [x] 微信 button 宽度问题修复
- [x] 服务器故障处理 & 应用栈重启
- [x] 代码上传到 GitHub（https://github.com/liyiyan102/meetpoint）
- [x] 需求文档更新（本文档）
- [ ] 开发者工具真机调试验收
- [ ] 正式版本提审微信小程序平台

---

## 八、附录

### 8.1 微信小程序授权能力限制

**chooseAvatar 原生按钮限制：**
- 必须绑定在 `<button open-type="chooseAvatar">` 上，无法用 JS 主动调起
- 只能在用户点击按钮时触发，无法通过代码自动弹出
- 必须在真机或开发者工具中测试，PC 端模拟器无效

**nickname input 限制：**
- 必须使用 `<input type="nickname">` 才能触发微信昵称快捷填充
- `focus` 属性需要配合 setData false→true 才能重复触发聚焦
- blur 事件会在键盘收起时自动触发，适合自动执行业务逻辑

### 8.2 技术栈 & 依赖版本

| 技术 | 版本 | 说明 |
|:---|:---|:---|
| 微信小程序基础库 | ≥ 2.21.0 | chooseAvatar 能力支持 |
| Node.js | 18.x | 服务端运行环境 |
| MongoDB | 6.x | 数据库 |
| Nginx | 1.24.x | 反向代理 + HTTPS |
| pm2 | 5.x | Node 进程管理 |
| 腾讯地图 JS SDK | 1.x | 地图搜索 & 导航 |

### 8.3 服务器配置

- **服务商**：腾讯云轻量应用服务器
- **IP**：43.155.128.236
- **域名**：meetpoint.top
- **SSL**：Let's Encrypt 自动续期
- **运维**：pm2 + systemctl

---

**文档维护者**：CodeBuddy AI  
**最后更新**：2026-04-23 14:42  
**联系方式**：https://github.com/liyiyan102/meetpoint/issues
