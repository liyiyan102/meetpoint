# 碰面 MeetPoint — 完整视觉设计规范

> **版本**：V1.0  
> **日期**：2026-04-23  
> **适用平台**：微信小程序  
> **设计工具**：Figma  
> **屏幕尺寸**：375×812pt (iPhone X 标准尺寸)

---

## 一、设计系统基础规范

### 1.1 颜色系统

#### 主色调（Primary）
```
品牌蓝：#3B82F6
  - Hover: #2563EB
  - Light: #60A5FA
  - Lightest: #DBEAFE
  - Background: #EFF6FF

用于：主按钮、图标、强调元素
```

#### 中性色（Neutral）
```
文字主色：#111827 (Gray-900)
文字次色：#6B7280 (Gray-500)
边框色：#D1D5DB (Gray-300)
背景浅灰：#F9FAFB (Gray-50)
分割线：#E5E7EB (Gray-200)
```

#### 功能色（Functional）
```
成功绿：#10B981
警告黄：#F59E0B
  - Background: #FFFBEB
  - Border: #FDE68A
错误红：#EF4444
信息蓝：#3B82F6
```

#### 渐变色（Gradient）
```
品牌渐变：
  - 方向：135deg
  - 起点：#60A5FA
  - 终点：#3B82F6

背景渐变（分享卡片）：
  - 方向：180deg
  - 起点：#EBF2FF
  - 终点：#D4E4FF
```

### 1.2 字体系统

#### 字号规范
```
超大标题：48rpx (24px) - 权重 700
大标题：  40rpx (20px) - 权重 600
标题：    32rpx (16px) - 权重 600
副标题：  30rpx (15px) - 权重 600
正文：    28rpx (14px) - 权重 400/500
辅助文字：26rpx (13px) - 权重 400
说明文字：24rpx (12px) - 权重 400
```

#### 行高规范
```
标题行高：1.2-1.3
正文行高：1.4-1.5
辅助文字：1.5-1.6
```

### 1.3 间距系统

```
超小：8rpx  (4px)
小：  16rpx (8px)
中：  24rpx (12px)
大：  32rpx (16px)
超大：40rpx (20px)
巨大：48rpx (24px)
```

**常用间距组合：**
- 卡片内边距：32rpx
- 列表项垂直间距：24rpx
- 按钮组间距：16rpx
- 表单元素间距：16rpx

### 1.4 圆角系统

```
微圆角：8rpx  - 用于小图标、标签
小圆角：12rpx - 用于输入框、小卡片
中圆角：16rpx - 用于按钮
大圆角：20rpx - 用于图标底、特性卡片图标
超大圆角：24rpx - 用于主卡片
完全圆角：50% - 用于头像、圆形按钮
```

### 1.5 阴影系统

```
轻阴影（卡片）：
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08);

中阴影（悬浮元素）：
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);

重阴影（模态框）：
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.16);

品牌阴影（蓝色按钮）：
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.25);
```

### 1.6 图标规范

**尺寸：**
```
超小图标：24rpx (12px)
小图标：  32rpx (16px)
中图标：  44rpx (22px)
大图标：  48rpx (24px)
超大图标：64rpx (32px)
特大图标：80rpx (40px)
```

**样式：**
- 线条粗细：2px
- 风格：线性图标（Outline）
- 颜色：默认继承父元素，品牌色/灰色按场景选择

---

## 二、组件库详细规范

### 2.1 按钮组件

#### 主按钮（Primary Button）
```
尺寸：
  - 高度：88rpx
  - 水平内边距：32rpx
  - 最小宽度：200rpx

视觉：
  - 背景色：#3B82F6
  - 文字颜色：#FFFFFF
  - 文字大小：32rpx
  - 文字权重：600
  - 圆角：16rpx
  - 阴影：0 8rpx 24rpx rgba(59, 130, 246, 0.25)

状态：
  - Hover: 背景色 #2563EB
  - Active: 背景色 #1D4ED8，向下位移 2rpx
  - Disabled: 背景色 #DBEAFE，文字色 #93C5FD
```

#### 次按钮（Secondary Button）
```
尺寸：同主按钮

视觉：
  - 背景色：#FFFFFF
  - 边框：2rpx solid #3B82F6
  - 文字颜色：#3B82F6
  - 文字大小：32rpx
  - 文字权重：600
  - 圆角：16rpx

状态：
  - Hover: 背景色 #EFF6FF
  - Active: 背景色 #DBEAFE
  - Disabled: 边框色 #DBEAFE，文字色 #DBEAFE
```

#### 警告按钮（Hint Button）
```
尺寸：同主按钮

视觉：
  - 背景色：#F59E0B
  - 文字颜色：#FFFFFF
  - 文字大小：32rpx
  - 文字权重：600
  - 圆角：16rpx

状态：
  - Hover: 背景色 #D97706
  - Active: 背景色 #B45309
```

#### 小按钮（Small Button）
```
尺寸：
  - 高度：64rpx
  - 水平内边距：24rpx

视觉：
  - 文字大小：26rpx
  - 其他同主按钮
```

### 2.2 输入框组件

#### 标准输入框
```
尺寸：
  - 高度：80rpx
  - 水平内边距：24rpx
  - 垂直内边距：0

视觉：
  - 背景色：#FFFFFF
  - 边框：2rpx solid #D1D5DB
  - 圆角：16rpx
  - 文字大小：28rpx
  - 文字颜色：#111827
  - Placeholder 颜色：#9CA3AF

状态：
  - Focus: 边框色 #3B82F6，背景色 #F9FAFB
  - Error: 边框色 #EF4444，背景色 #FEF2F2
  - Disabled: 背景色 #F3F4F6，文字色 #9CA3AF
```

#### 高亮输入框（引导态）
```
视觉：
  - 背景色：#FFFBEB
  - 边框：2rpx solid #F59E0B
  - 动画：pulse 1s infinite
    0%: box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5)
    50%: box-shadow: 0 0 0 12rpx rgba(245, 158, 11, 0.3)
```

### 2.3 卡片组件

#### 标准卡片
```
尺寸：
  - 宽度：auto (父容器 - 64rpx 左右边距)
  - 内边距：32rpx
  - 最小高度：120rpx

视觉：
  - 背景色：#FFFFFF
  - 圆角：24rpx
  - 阴影：0 2rpx 16rpx rgba(0, 0, 0, 0.08)
```

#### 浅灰卡片（次要信息）
```
视觉：
  - 背景色：#F9FAFB
  - 圆角：24rpx
  - 无阴影
  - 内边距：32rpx
```

#### 蓝色强调卡片
```
视觉：
  - 背景色：#3B82F6
  - 文字颜色：#FFFFFF
  - 圆角：24rpx
  - 阴影：0 8rpx 24rpx rgba(59, 130, 246, 0.25)
  - 内边距：32rpx
```

#### 地点卡片（Mini POI Card）
```
尺寸：
  - 高度：auto
  - 水平内边距：32rpx
  - 垂直内边距：24rpx

视觉：
  - 背景色：#EFF6FF
  - 边框：2rpx solid #DBEAFE
  - 圆角：20rpx
  - 图标：32rpx 蓝色 pin 图标
  - 地点名：30rpx，权重 600，颜色 #1E40AF
  - 距离信息：26rpx，权重 400，颜色 #6B7280
```

### 2.4 头像组件

#### 标准头像
```
尺寸：
  - 直径：88rpx
  - 边框：4rpx solid #FFFFFF

视觉：
  - 圆角：50%
  - 背景色（无头像时）：#EFF6FF
  - 文字颜色（首字）：#3B82F6
  - 文字大小：32rpx
  - 文字权重：600
  - 阴影：0 2rpx 8rpx rgba(0, 0, 0, 0.08)
```

#### 小头像（头像堆叠）
```
尺寸：
  - 直径：72rpx
  - 边框：4rpx solid #FFFFFF
  - 堆叠间距：-16rpx

视觉：
  - 圆角：50%
  - z-index：从左到右递减（10, 9, 8...）
```

#### 头像编辑按钮
```
尺寸：
  - 直径：88rpx
  - 角标尺寸：40rpx × 40rpx

视觉：
  - 角标位置：右下角
  - 角标背景：#3B82F6
  - 角标图标：24rpx 白色相机图标
  - 角标圆角：50%
  - 角标边框：4rpx solid #FFFFFF
```

### 2.5 图标底座组件

#### 特性介绍图标底（首页）
```
尺寸：
  - 宽高：88rpx × 88rpx

视觉：
  - 背景色：#EFF6FF
  - 圆角：20rpx
  - 图标尺寸：44rpx
  - 图标颜色：#3B82F6
  - 对齐：居中
```

#### 邀请卡片图标底（地图页）
```
尺寸：
  - 直径：80rpx

视觉：
  - 背景色：rgba(255, 255, 255, 0.2)
  - 圆角：50%
  - 图标：48rpx "+" 号
  - 图标颜色：#FFFFFF
  - 图标权重：700
```

### 2.6 导航栏组件

#### 返回按钮（join 页）
```
尺寸：
  - 直径：64rpx

视觉：
  - 背景色：rgba(255, 255, 255, 0.9)
  - 圆角：50%
  - 图标："‹" 符号
  - 图标大小：48rpx
  - 图标颜色：#3B82F6
  - 阴影：0 2rpx 8rpx rgba(0, 0, 0, 0.1)

位置：
  - 左上角：16rpx + safe-area-inset-top
  - 左边距：32rpx
```

### 2.7 模态框组件

#### 成功引导弹层
```
尺寸：
  - 宽度：600rpx
  - 内边距：48rpx 40rpx

视觉：
  - 背景色：#FFFFFF
  - 圆角：24rpx
  - 阴影：0 8rpx 40rpx rgba(0, 0, 0, 0.16)

布局：
  - 顶部图标：80rpx 蓝色渐变圆 + 白色定位图标
  - 标题：40rpx，权重 600，颜色 #111827
  - 描述：28rpx，权重 400，颜色 #6B7280，行高 1.5
  - 按钮组：两个按钮横向排列，间距 16rpx
```

#### 遮罩层
```
视觉：
  - 背景色：rgba(0, 0, 0, 0.5)
  - 全屏覆盖
  - z-index：1000
```

---

## 三、页面布局详细规范

### 3.1 首页（index）

#### 3.1.1 页面结构
```
[安全区顶部]
├── Header 区（品牌 Logo + 标题）
│   ├── Logo：120rpx × 120rpx
│   ├── 标题："约个地儿"，48rpx，权重 700
│   └── 副标题：26rpx，颜色 #6B7280
│
├── 主内容滚动区
│   ├── 【首次进入】产品特性卡片（无头像+无昵称时）
│   │   ├── 特性 1：一键发起碰头
│   │   ├── 特性 2：微信邀请好友
│   │   └── 特性 3：智能推荐地点
│   │
│   ├── 【已授权】我的信息卡片（有头像或昵称时）
│   │   ├── 头像编辑按钮：88rpx，右下角相机角标
│   │   └── 昵称输入框：高度 80rpx
│   │
│   └── 【进行中】碰头卡片（activeMeeting 存在时）
│       ├── 顶部彩条装饰：高 8rpx，渐变色
│       ├── 状态标签："进行中" + pulse 动画圆点
│       ├── 信息区：发起人、地点、成员头像堆叠
│       └── 按钮区：继续碰头 / 结束（退出）
│
└── 底部固定区（无 activeMeeting 时）
    ├── CTA 按钮：88rpx 高，三态切换
    │   - 无头像 → chooseAvatar 按钮
    │   - 有头像无昵称 → 警告色提示按钮
    │   - 已完整授权 → 正常主按钮
    └── 提示文字：24rpx，颜色 #6B7280
```

#### 3.1.2 产品特性卡片布局
```
.feature-card
  padding: 40rpx 32rpx
  background: #FFFFFF
  border-radius: 24rpx
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08)

  .feature-item (三个，垂直排列，间距 36rpx)
    display: flex
    gap: 24rpx
    
    .feature-icon-wrap
      width: 88rpx
      height: 88rpx
      background: #EFF6FF
      border-radius: 20rpx
      
      .icon (居中)
        width: 44rpx
        height: 44rpx
        color: #3B82F6
    
    .feature-texts
      flex: 1
      
      .feature-title
        font-size: 32rpx
        font-weight: 600
        color: #111827
        line-height: 1.3
      
      .feature-desc
        font-size: 26rpx
        color: #6B7280
        line-height: 1.5
        margin-top: 10rpx
```

#### 3.1.3 我的信息卡片布局
```
.profile-card
  display: flex
  align-items: center
  gap: 24rpx
  padding: 32rpx
  
  .avatar-container
    position: relative
    width: 88rpx
    height: 88rpx
    
    .avatar-img
      width: 100%
      height: 100%
      border-radius: 50%
    
    .edit-badge (右下角)
      position: absolute
      right: -8rpx
      bottom: -8rpx
      width: 40rpx
      height: 40rpx
      background: #3B82F6
      border-radius: 50%
      border: 4rpx solid #FFFFFF
      
      .icon
        width: 24rpx
        height: 24rpx
        color: #FFFFFF
  
  .input-box
    flex: 1
    height: 80rpx
    border: 2rpx solid #D1D5DB
    border-radius: 16rpx
    
    &.input-box-focus
      border-color: #3B82F6
      background: #F9FAFB
    
    &.input-box-highlight
      border-color: #F59E0B
      background: #FFFBEB
      animation: nickname-pulse 1s infinite
```

#### 3.1.4 进行中碰头卡片布局
```
.active-card
  position: relative
  padding: 32rpx
  background: #FFFFFF
  border-radius: 24rpx
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08)
  
  &::before (顶部彩条装饰)
    content: ''
    position: absolute
    top: 0
    left: 0
    right: 0
    height: 8rpx
    background: linear-gradient(90deg, #60A5FA, #3B82F6)
    border-radius: 24rpx 24rpx 0 0
  
  .active-header
    .status-tag
      display: inline-flex
      align-items: center
      gap: 8rpx
      padding: 8rpx 16rpx
      background: #DBEAFE
      border-radius: 8rpx
      
      .pulse-dot
        width: 12rpx
        height: 12rpx
        background: #3B82F6
        border-radius: 50%
        animation: pulse 2s infinite
      
      .status-tag-text
        font-size: 24rpx
        color: #1E40AF
  
  .active-info
    display: flex
    justify-content: space-between
    margin-top: 24rpx
    
    .active-detail-rows
      flex: 1
      
      .active-detail-row
        display: flex
        gap: 16rpx
        margin-bottom: 12rpx
        
        .active-detail-label
          font-size: 26rpx
          color: #6B7280
        
        .active-detail-value
          font-size: 26rpx
          color: #111827
    
    .active-info-right
      display: flex
      flex-direction: column
      align-items: flex-end
      gap: 12rpx
      
      .avatar-stack
        display: flex
        
        .stack-avatar
          width: 56rpx
          height: 56rpx
          border-radius: 50%
          border: 4rpx solid #FFFFFF
          margin-left: -20rpx (除了第一个)
          z-index: 递减
      
      .active-count
        font-size: 24rpx
        color: #6B7280
  
  .active-actions
    display: flex
    gap: 16rpx
    margin-top: 24rpx
    
    .btn-continue
      flex: 1
      background: #3B82F6
    
    .btn-end
      width: 120rpx
      background: #FFFFFF
      border: 2rpx solid #E5E7EB
      color: #6B7280
```

---

### 3.2 加入页（join）

#### 3.2.1 页面结构
```
[安全区顶部]
├── 自定义导航栏
│   └── 返回按钮：64rpx 圆形，左上角
│
├── 主内容区（垂直居中）
│   ├── 品牌 Logo：120rpx 蓝色渐变圆
│   ├── 主标题："{发起人}邀请你碰头"，40rpx
│   ├── 【有地点】地点卡片（poi-card-mini）
│   ├── 副标题：动态文案，28rpx
│   ├── 信息卡片
│   │   ├── 参与人头像组（5 个 + more）
│   │   ├── 发起人：26rpx
│   │   ├── 已参与：26rpx
│   │   └── 发起时间：26rpx
│   ├── 【有头像无昵称】昵称输入卡片
│   └── CTA 按钮：四态切换
│       - 已加入 → 灰色禁用
│       - 无头像 → chooseAvatar 按钮
│       - 有头像无昵称 → 警告色提示
│       - 已完整授权 → 正常主按钮
│
└── 底部提示文字
    └── "加入后需授权定位 · {时间}前发起"
```

#### 3.2.2 返回按钮布局
```
.join-navbar
  position: fixed
  top: calc(env(safe-area-inset-top) + 16rpx)
  left: 32rpx
  z-index: 100
  
  .join-navbar-back
    width: 64rpx
    height: 64rpx
    background: rgba(255, 255, 255, 0.9)
    border-radius: 50%
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1)
    display: flex
    align-items: center
    justify-content: center
    
    .back-icon ("‹" 符号)
      font-size: 48rpx
      color: #3B82F6
      font-weight: 600
      line-height: 1
```

#### 3.2.3 地点卡片布局
```
.poi-card-mini
  display: flex
  align-items: center
  gap: 16rpx
  padding: 24rpx 32rpx
  background: #EFF6FF
  border: 2rpx solid #DBEAFE
  border-radius: 20rpx
  margin: 24rpx 0
  
  .poi-icon
    width: 32rpx
    height: 32rpx
    color: #3B82F6
  
  .poi-info
    flex: 1
    
    .poi-name
      font-size: 30rpx
      font-weight: 600
      color: #1E40AF
      line-height: 1.3
    
    .poi-distance
      font-size: 26rpx
      color: #6B7280
      margin-top: 4rpx
```

#### 3.2.4 信息卡片布局
```
.invite-card
  padding: 32rpx
  background: #FFFFFF
  border-radius: 24rpx
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.08)
  
  .invite-avatars (头像组)
    display: flex
    justify-content: center
    align-items: center
    padding: 16rpx 0 20rpx
    
    .invite-avatar
      width: 72rpx
      height: 72rpx
      border-radius: 50%
      border: 4rpx solid #FFFFFF
      background: #EFF6FF
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08)
      margin-left: -16rpx (除了第一个)
      z-index: 递减
      
      .invite-avatar-img
        width: 100%
        height: 100%
        border-radius: 50%
      
      .invite-avatar-text (首字)
        font-size: 26rpx
        font-weight: 600
        color: #3B82F6
    
    .invite-avatar-more
      background: #DBEAFE
      font-size: 22rpx
      color: #3B82F6
  
  .invite-row
    display: flex
    justify-content: space-between
    padding: 12rpx 0
    border-bottom: 1rpx solid #F3F4F6 (最后一个无)
    
    .invite-label
      font-size: 26rpx
      color: #6B7280
    
    .invite-name
      font-size: 26rpx
      color: #111827
      font-weight: 500
```

#### 3.2.5 昵称输入卡片布局（有头像无昵称时）
```
.join-nickname-box
  padding: 24rpx 32rpx
  background: #FFFBEB
  border: 2rpx solid #FDE68A
  border-radius: 16rpx
  margin: 24rpx 0
  animation: slideDown 0.3s ease
  
  .join-nickname-label
    font-size: 26rpx
    color: #92400E
    margin-bottom: 12rpx
  
  .join-nickname-input
    height: 80rpx
    border: 2rpx solid #F59E0B
    border-radius: 12rpx
    padding: 0 24rpx
    background: #FFFFFF
```

---

### 3.3 地图页（map）

#### 3.3.1 页面结构
```
[全屏地图]
├── <map> 组件（腾讯地图）
│   ├── Marker：用户位置、推荐地点
│   └── Polyline：路径规划线
│
├── 顶部工具栏（固定）
│   ├── 返回首页按钮
│   ├── 碰头标题 + 人数
│   └── 分享按钮
│
├── 右侧工具栏（固定）
│   ├── 我的位置按钮
│   ├── 添加好友按钮
│   ├── 推荐地点按钮
│   └── 成员列表按钮
│
└── 底部面板（三种，互斥）
    ├── 【A】添加好友位置面板
    │   ├── 主 CTA：邀请好友加入（蓝色一体卡片）
    │   └── 次功能：手动标记好友位置（浅灰卡片）
    │
    ├── 【B】推荐地点面板（可最小化）
    │   ├── 推荐地点列表（上滑可展开）
    │   └── 地点项：图标 + 名称 + 距离 + 选择按钮
    │
    └── 【C】成员列表面板（可最小化）
        ├── 在线成员列表
        ├── 离线成员列表
        └── 手动标记成员列表
```

#### 3.3.2 顶部工具栏布局
```
.top-bar
  position: fixed
  top: calc(env(safe-area-inset-top) + 16rpx)
  left: 32rpx
  right: 32rpx
  display: flex
  align-items: center
  gap: 16rpx
  z-index: 100
  
  .back-btn
    width: 64rpx
    height: 64rpx
    background: rgba(255, 255, 255, 0.95)
    border-radius: 50%
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1)
  
  .meeting-info
    flex: 1
    padding: 16rpx 24rpx
    background: rgba(255, 255, 255, 0.95)
    border-radius: 32rpx
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1)
    
    .meeting-title
      font-size: 28rpx
      font-weight: 600
      color: #111827
    
    .meeting-count
      font-size: 24rpx
      color: #6B7280
  
  .share-btn
    width: 64rpx
    height: 64rpx
    background: #3B82F6
    border-radius: 50%
    box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3)
```

#### 3.3.3 右侧工具栏布局
```
.toolbar
  position: fixed
  right: 32rpx
  bottom: calc(200rpx + env(safe-area-inset-bottom))
  display: flex
  flex-direction: column
  gap: 16rpx
  z-index: 100
  
  .tool-btn
    width: 88rpx
    height: 88rpx
    background: rgba(255, 255, 255, 0.95)
    border-radius: 50%
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1)
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center
    gap: 4rpx
    
    .tool-icon
      width: 44rpx
      height: 44rpx
      color: #3B82F6
    
    .tool-text
      font-size: 20rpx
      color: #6B7280
```

#### 3.3.4 添加好友面板布局
```
.panel
  position: fixed
  left: 0
  right: 0
  bottom: 0
  background: #FFFFFF
  border-radius: 32rpx 32rpx 0 0
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom))
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.1)
  max-height: 80vh
  z-index: 200
  
  .panel-handle (拖动手柄)
    width: 72rpx
    height: 8rpx
    background: #E5E7EB
    border-radius: 4rpx
    margin: 0 auto 16rpx
  
  .panel-head-row
    display: flex
    justify-content: space-between
    align-items: center
    margin-bottom: 8rpx
    
    .panel-title
      font-size: 32rpx
      font-weight: 600
      color: #111827
    
    .panel-close
      width: 48rpx
      height: 48rpx
      display: flex
      align-items: center
      justify-content: center
```

#### 3.3.5 邀请好友卡片布局（蓝色一体）
```
.invite-section-btn
  display: block !important
  width: 100% !important
  max-width: none !important
  min-width: 0 !important
  padding: 0 !important
  margin: 16rpx 0 0 !important
  background: transparent !important
  border: none !important
  border-radius: 24rpx
  overflow: hidden
  
  .invite-section
    display: flex
    align-items: center
    gap: 24rpx
    padding: 32rpx
    background: #3B82F6
    color: #FFFFFF
    border-radius: 24rpx
    box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.25)
    
    .invite-icon-circle
      width: 80rpx
      height: 80rpx
      background: rgba(255, 255, 255, 0.2)
      border-radius: 50%
      display: flex
      align-items: center
      justify-content: center
      flex-shrink: 0
      
      .invite-icon-plus
        font-size: 48rpx
        font-weight: 700
        color: #FFFFFF
    
    .invite-section-texts
      flex: 1
      display: flex
      flex-direction: column
      gap: 6rpx
      
      .invite-section-title
        font-size: 30rpx
        font-weight: 600
        color: #FFFFFF
        line-height: 1.3
      
      .invite-section-desc
        font-size: 24rpx
        color: rgba(255, 255, 255, 0.85)
        line-height: 1.4
```

#### 3.3.6 手动标记卡片布局（浅灰常驻）
```
.manual-section
  background: #F9FAFB
  padding: 32rpx
  border-radius: 24rpx
  margin-top: 24rpx
  
  .manual-section-title
    font-size: 28rpx
    font-weight: 600
    color: #111827
    margin-bottom: 20rpx
  
  .manual-input
    height: 80rpx
    border: 1rpx solid #D1D5DB
    border-radius: 16rpx
    padding: 0 24rpx
    background: #FFFFFF
    font-size: 28rpx
    margin-bottom: 16rpx
  
  .manual-input-group
    display: flex
    gap: 16rpx
    
    .manual-input-flex
      flex: 1
    
    .manual-search-btn
      height: 80rpx
      padding: 0 32rpx
      background: #3B82F6
      color: #FFFFFF
      font-size: 28rpx
      font-weight: 500
      border-radius: 16rpx
      
      &:active
        background: #2563EB
  
  .search-results-wrap
    margin-top: 16rpx
    
    .search-item
      padding: 20rpx 0
      border-bottom: 1rpx solid #E5E7EB
      
      .si-name
        font-size: 28rpx
        color: #111827
        display: block
      
      .si-addr
        font-size: 24rpx
        color: #6B7280
        margin-top: 8rpx
  
  .friend-confirm-row
    display: flex
    justify-content: space-between
    align-items: center
    margin-top: 24rpx
    padding: 20rpx
    background: #EFF6FF
    border-radius: 12rpx
    
    .fn-label
      font-size: 26rpx
      color: #1E40AF
      display: flex
      align-items: center
      gap: 8rpx
    
    .btn-green
      background: #10B981
      color: #FFFFFF
      padding: 12rpx 24rpx
      border-radius: 8rpx
```

#### 3.3.7 推荐地点面板布局
```
.panel-recommend-wrap
  position: fixed
  left: 0
  right: 0
  bottom: 0
  background: #FFFFFF
  border-radius: 32rpx 32rpx 0 0
  padding: 0 32rpx calc(24rpx + env(safe-area-inset-bottom))
  max-height: 55vh
  z-index: 200
  transition: max-height 0.3s ease
  
  &.panel-recommend-collapsed
    max-height: 120rpx
  
  .panel-handle-bar
    padding: 16rpx 0 8rpx
    display: flex
    justify-content: center
    
    .panel-handle
      width: 72rpx
      height: 8rpx
      background: #E5E7EB
      border-radius: 4rpx
  
  .recommend-list-wrap
    max-height: 50vh
    overflow-y: auto
    
    .rec-item
      display: flex
      align-items: center
      padding: 24rpx 0
      border-bottom: 1rpx solid #F3F4F6
      
      .rec-icon
        width: 56rpx
        height: 56rpx
        background: #EFF6FF
        border-radius: 12rpx
        display: flex
        align-items: center
        justify-content: center
        
        .icon
          width: 32rpx
          height: 32rpx
          color: #3B82F6
      
      .rec-info
        flex: 1
        margin-left: 16rpx
        
        .rec-name
          font-size: 28rpx
          font-weight: 500
          color: #111827
        
        .rec-distance
          font-size: 24rpx
          color: #6B7280
          margin-top: 4rpx
      
      .rec-select-btn
        padding: 12rpx 24rpx
        background: #3B82F6
        color: #FFFFFF
        border-radius: 8rpx
        font-size: 26rpx
```

---

## 四、交互流程图

### 4.1 首次进入流程

```
用户打开小程序
    ↓
检查本地存储
    ↓
┌───────────────────────┐
│ 无头像 && 无昵称？     │
└───────────────────────┘
    ↓ YES                   ↓ NO
展示产品特性卡片        展示"我的信息"卡片
底部按钮 = chooseAvatar  底部按钮 = 正常发起
    ↓
用户点击"发起碰头"
    ↓
调起微信原生头像选择
    ↓
用户选择头像
    ↓
保存头像到本地
    ↓
昵称输入框高亮闪烁 2 秒
    ↓
用户输入昵称并失焦
    ↓
自动发起碰头
    ↓
跳转到地图页
```

### 4.2 分享进入流程

```
用户点击分享卡片
    ↓
打开小程序 join 页
    ↓
解析 URL 参数（meetingId, inviter, count, poi）
    ↓
加载碰头信息（API）
    ↓
检查本地授权状态
    ↓
┌───────────────────────┐
│ 已加入此碰头？         │
└───────────────────────┘
    ↓ YES                   ↓ NO
CTA 按钮显示"已加入"    检查授权状态
    ↓                       ↓
                    ┌────────────────┐
                    │ 有头像+昵称？  │
                    └────────────────┘
                        ↓ YES    ↓ NO
                    直接加入    引导授权
                        ↓           ↓
                                ┌────────────┐
                                │ 无头像？    │
                                └────────────┘
                                    ↓ YES  ↓ NO
                            chooseAvatar  昵称输入
                                    ↓           ↓
                            选择头像后  输入昵称
                                    ↓           ↓
                            昵称输入框  ────────┘
                                    ↓
                            用户输入昵称并失焦
                                    ↓
                            自动加入碰头
                                    ↓
                            弹出成功引导弹层
                                    ↓
                        ┌────────────────────┐
                        │ 用户选择？          │
                        └────────────────────┘
                            ↓ 邀请好友  ↓ 进入碰面
                        触发分享面板  跳转地图页
```

### 4.3 地图页添加好友流程

```
地图页右侧工具栏
    ↓
用户点击"添加好友"按钮
    ↓
底部弹出添加好友面板
    ↓
┌───────────────────────────┐
│ 用户选择？                 │
└───────────────────────────┘
    ↓ 邀请好友（主）      ↓ 手动标记（次）
点击蓝色邀请卡片      输入好友昵称
    ↓                       ↓
触发微信分享面板      输入地点关键词
    ↓                       ↓
分享给微信好友        点击"搜索"按钮
    ↓                       ↓
对方点击加入          展示搜索结果列表
                            ↓
                    用户选择地点项
                            ↓
                    展示确认添加行
                            ↓
                    点击"确认添加"按钮
                            ↓
                    API 调用添加手动好友
                            ↓
                    地图上显示好友位置
                            ↓
                    关闭面板
```

---

## 五、动画效果规范

### 5.1 淡入动画（Fade In）
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
```

### 5.2 向上滑入动画（Slide Up）
```css
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp 0.3s ease;
}
```

### 5.3 向下滑入动画（Slide Down）
```css
@keyframes slideDown {
  from {
    transform: translateY(-20rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.slide-down {
  animation: slideDown 0.3s ease;
}
```

### 5.4 Pulse 动画（呼吸灯）
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.pulse {
  animation: pulse 2s infinite;
}
```

### 5.5 昵称高亮动画（Nickname Pulse）
```css
@keyframes nickname-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5);
  }
  50% {
    box-shadow: 0 0 0 12rpx rgba(245, 158, 11, 0.3);
  }
}

.input-box-highlight {
  animation: nickname-pulse 1s ease-in-out infinite;
}
```

### 5.6 按钮按下动画（Button Press）
```css
.btn:active {
  transform: translateY(2rpx);
  transition: transform 0.1s ease;
}
```

---

## 六、响应式适配规范

### 6.1 安全区域适配

```css
/* 顶部安全区 */
.top-bar {
  padding-top: calc(16rpx + env(safe-area-inset-top));
}

/* 底部安全区 */
.bottom-anchor {
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

/* 面板底部安全区 */
.panel {
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
```

### 6.2 不同屏幕尺寸适配

```
基准屏幕：375×812pt (iPhone X)
单位换算：1rpx = 0.5px

小屏（320×568 iPhone SE）：
  - 减少垂直间距 10%
  - 字号保持不变（避免过小）

大屏（414×896 iPhone 11 Pro Max）：
  - 增加水平边距 10%
  - 字号保持不变（避免过大）

超大屏（428×926 iPhone 14 Pro Max）：
  - 最大内容宽度 750rpx 居中
  - 卡片投影增强 20%
```

---

## 七、Figma 文件组织建议

### 7.1 页面结构
```
📁 碰面 MeetPoint 设计规范
├── 📄 封面页
│   └── 项目信息、版本号、设计师
├── 📄 设计系统
│   ├── 颜色板（Color Palette）
│   ├── 字体规范（Typography）
│   ├── 间距系统（Spacing）
│   ├── 圆角系统（Border Radius）
│   ├── 阴影系统（Shadows）
│   └── 图标库（Icons）
├── 📄 组件库（Components）
│   ├── 按钮组件（Buttons）
│   ├── 输入框组件（Inputs）
│   ├── 卡片组件（Cards）
│   ├── 头像组件（Avatars）
│   ├── 图标底座（Icon Containers）
│   ├── 导航栏（Navigation）
│   └── 模态框（Modals）
├── 📄 首页（Index）
│   ├── 首次进入态（产品特性）
│   ├── 已授权态（我的信息）
│   ├── 进行中态（活跃碰头）
│   └── 交互状态标注
├── 📄 加入页（Join）
│   ├── 主界面
│   ├── 昵称输入态
│   ├── 成功弹层
│   └── 交互流程标注
├── 📄 地图页（Map）
│   ├── 主界面
│   ├── 添加好友面板
│   ├── 推荐地点面板
│   ├── 成员列表面板
│   └── 交互热区标注
└── 📄 交互流程图
    ├── 首次进入流程
    ├── 分享进入流程
    └── 添加好友流程
```

### 7.2 命名规范

**图层命名：**
```
组件：Component/Button/Primary
页面：Page/Index/First-Time
图标：Icon/Camera/24px
```

**颜色命名：**
```
Primary/Blue/500
Neutral/Gray/900
Functional/Success
```

**组件命名：**
```
Button/Primary/Large
Card/Standard/White
Avatar/Standard/88px
```

### 7.3 Auto Layout 使用建议

- 所有卡片使用 Auto Layout（垂直/水平）
- 间距使用变量（Space Between）
- 按钮使用 Hug Contents（宽度自适应）
- 卡片使用 Fill Container（宽度撑满）

---

## 八、开发交接清单

### 8.1 设计资源交付

- [ ] Figma 设计稿链接（可编辑权限）
- [ ] 导出的 PNG/SVG 切图资源
- [ ] 图标 SVG 源文件（27 个）
- [ ] 设计规范文档（本文档）
- [ ] 标注尺寸截图（关键页面）

### 8.2 前端开发注意事项

1. **单位换算**：Figma 中的 px → 微信小程序的 rpx（1px = 2rpx）
2. **安全区域**：所有固定定位元素必须考虑 safe-area-inset
3. **图标颜色**：SVG 图标使用 currentColor 继承父元素颜色
4. **按钮宽度**：微信 button 组件需要强制覆盖 UA 样式（!important）
5. **动画性能**：使用 transform 而非 top/left 进行位移动画
6. **昵称输入框**：focus 属性需要先 false 再 true 才能重复触发

### 8.3 设计走查重点

- [ ] 颜色准确性（品牌蓝 #3B82F6）
- [ ] 间距一致性（32rpx 卡片内边距）
- [ ] 圆角统一性（24rpx 主卡片圆角）
- [ ] 字号规范性（32rpx 标题、28rpx 正文）
- [ ] 阴影效果（品牌阴影 rgba(59, 130, 246, 0.25)）
- [ ] 动画流畅性（0.3s ease 标准过渡）
- [ ] 交互反馈（按钮 hover/active 态）

---

## 九、版本记录

| 版本 | 日期 | 修改内容 | 修改人 |
|:---|:---|:---|:---|
| V1.0 | 2026-04-23 | 初始版本，完整设计规范 | CodeBuddy AI |

---

**文档维护者**：CodeBuddy AI  
**联系方式**：https://github.com/liyiyan102/meetpoint  
**最后更新**：2026-04-23 14:50
