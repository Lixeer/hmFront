# 像素字体兼容性说明

## 字体配置

本项目使用 NES.css 推荐的 **Press Start 2P** 像素字体，为应用提供统一的复古游戏风格视觉效果。

### 字体加载

字体通过以下两种方式加载：
1. **Google Fonts CDN**：`index.html` 中通过 `<link>` 标签引入
2. **CSS @import**：`main.css` 中使用 `@import` 规则引入

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

```css
/* main.css */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
```

## 浏览器兼容性

### 支持的浏览器

| 浏览器 | 最低版本 | 兼容性 | 备注 |
|--------|---------|--------|------|
| Chrome | 4.0+ | ✅ 完全支持 | 推荐使用最新版本 |
| Firefox | 3.5+ | ✅ 完全支持 | 推荐使用最新版本 |
| Safari | 3.1+ | ✅ 完全支持 | iOS Safari 同样支持 |
| Edge | 12.0+ | ✅ 完全支持 | 基于 Chromium |
| Opera | 10.0+ | ✅ 完全支持 | 推荐使用最新版本 |
| IE | ❌ 不支持 | 降级显示 | 使用系统字体栈 |

### 字体回退策略

应用使用完整的字体回退栈：

```css
font-family: 'Press Start 2P', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

回退顺序：
1. **Press Start 2P** - 像素字体（主要）
2. **-apple-system** - macOS/iOS 系统字体
3. **BlinkMacSystemFont** - Chrome on macOS
4. **Segoe UI** - Windows 系统字体
5. **sans-serif** - 通用无衬线字体

### 加载失败处理

如果 Google Fonts 加载失败，浏览器会自动使用回退字体栈，确保应用仍然可用，只是外观变为普通字体。

## 性能优化

### 字体预加载

推荐在生产环境中使用 `<link rel="preconnect">` 优化字体加载速度：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 本地字体（可选）

如需离线使用或提高加载速度，可以：

1. 下载字体文件到本地
2. 将字体文件放入 `public/fonts/` 目录
3. 修改 CSS 中的字体引用路径

## 响应式字体

### 字体大小缩放

| 屏幕宽度 | 基础字号 | 说明 |
|---------|---------|------|
| > 768px | 14px | 桌面端 |
| 480-768px | 12px | 平板端 |
| < 480px | 10px | 移动端 |

### 字号单位

项目统一使用 `rem` 单位，实现相对于根元素的字体缩放：

```css
html {
  font-size: 14px; /* 基础字号 */
}
```

## 常见问题

### Q1: 为什么字体显示为普通字体？

可能原因：
- 网络问题导致 Google Fonts 无法加载
- 浏览器禁用了网络字体
- 使用了广告拦截插件

解决方法：
- 检查网络连接
- 暂时禁用广告拦截插件
- 等待几秒后刷新页面

### Q2: 字体显示模糊怎么办？

像素字体在某些高分辨率屏幕上可能出现模糊。

解决方法：
- Chrome: 设置 → 外观 → 自定义字体 → 禁用"使用硬件加速"
- 确保浏览器缩放为 100%

### Q3: 移动端字体太小看不清？

应用已针对移动端进行了字体缩放优化。如仍有问题：

1. 检查浏览器缩放设置（应为 100%）
2. 双指缩放调整页面大小
3. 清除浏览器缓存后重试

## 测试建议

### 测试步骤

1. **桌面浏览器测试**
   - Chrome 最新版
   - Firefox 最新版
   - Safari (macOS)
   - Edge 最新版

2. **移动端测试**
   - iOS Safari (iPhone/iPad)
   - Chrome Android
   - 微信内置浏览器

3. **网络环境测试**
   - 正常网络连接
   - 离线环境（验证回退字体）
   - 弱网环境（验证降级体验）

### 验收标准

- ✅ 所有页面文本显示为像素字体（或回退字体）
- ✅ 字体清晰可读，无明显模糊
- ✅ 不同屏幕尺寸下文字比例协调
- ✅ 交互元素（按钮、输入框）字体一致
- ✅ 页面加载时间可接受

## 技术支持

如遇到字体相关问题，请提供以下信息：
1. 浏览器名称和版本
2. 操作系统和版本
3. 网络环境描述
4. 问题截图
5. 控制台错误信息（如有）

---

**最后更新：** 2026-06-22
**版本：** 1.0.0
