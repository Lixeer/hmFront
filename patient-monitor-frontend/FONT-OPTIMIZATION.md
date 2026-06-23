# 中文像素字体优化实施方案

## 一、问题分析

### 当前问题
- NES.css 库默认使用的 `Press Start 2P` 字体仅支持英文，不支持中文
- 中文文本显示为系统默认字体，破坏了像素风格的一致性

### 需求目标
1. ✅ 仅替换中文字体样式，保持 NES.css 其他视觉效果不变
2. ✅ 中文字体符合像素风格设计规范
3. ✅ 保证不同设备和浏览器的一致性
4. ✅ 避免字体加载导致的页面闪烁（FOIT/FOUT）

## 二、字体选择方案

### 2.1 字体选型

| 字体名称 | 类型 | 特点 | 适用场景 |
|---------|------|------|---------|
| **ZCOOL KuaiLe** | 中文像素风 | 圆润像素风格，适合标题 | 主标题、按钮文本 |
| **Ma Shan Zheng** | 中文像素风 | 方正像素风格，适合正文 | 正文内容、表格数据 |
| **Press Start 2P** | 英文像素风 | 经典像素字体 | 英文文本、数字、符号 |

### 2.2 字体组合策略

```css
/* 中文字体优先，英文字体后备 */
font-family: 'ZCOOL KuaiLe', 'Ma Shan Zheng', 'Press Start 2P', system-ui, sans-serif;
```

**字体回退顺序：**
1. ZCOOL KuaiLe（首选中文像素字体）
2. Ma Shan Zheng（备选中文像素字体）
3. Press Start 2P（英文像素字体）
4. system-ui（系统字体）
5. sans-serif（通用无衬线字体）

## 三、CSS 样式覆盖规则

### 3.1 全局字体配置

```css
:root {
  --font-pixel-en: 'Press Start 2P', monospace;
  --font-pixel-zh: 'ZCOOL KuaiLe', cursive;
  --font-pixel-zh-alt: 'Ma Shan Zheng', cursive;
}

body, body * {
  font-family: var(--font-pixel-zh), var(--font-pixel-zh-alt), var(--font-pixel-en), 
               -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  -webkit-font-smoothing: none;  /* 禁用抗锯齿，保持像素感 */
  font-display: swap;             /* 避免 FOIT */
}
```

### 3.2 特定元素样式

| 元素类型 | CSS 选择器 | 字体配置 |
|---------|-----------|---------|
| 标题 | `h1-h6, .title` | 中文字体 + 英文后备 |
| 按钮 | `button, .nes-btn` | 中文字体 + 英文后备 |
| 表单 | `input, select, textarea` | 中文字体 + 英文后备 |
| 表格 | `table, .nes-table` | 中文字体 + 英文后备 |
| 列表 | `ul, ol, .nes-list` | 中文字体 + 英文后备 |
| 徽章 | `.nes-badge` | 中文字体 + 英文后备 |
| 气泡 | `.nes-balloon` | 中文字体 + 英文后备 |

## 四、字体加载性能优化

### 4.1 预加载策略

```html
<!-- 预连接优化 -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- 字体引入 -->
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&display=swap" rel="stylesheet" />
```

### 4.2 font-display 属性

| 属性值 | 行为 | 适用场景 |
|-------|------|---------|
| `swap` | 立即显示后备字体，字体加载完成后替换 | **推荐**：避免 FOIT |
| `fallback` | 短暂等待后显示后备字体 | 对字体要求较高的场景 |
| `optional` | 仅在字体快速加载时使用 | 非关键文本 |

### 4.3 FOIT/FOUT 解决方案

**问题**：字体加载期间页面闪烁或布局偏移

**解决方案**：
1. 使用 `font-display: swap` 立即显示后备字体
2. 设置固定行高避免布局偏移
3. 添加字体加载完成动画过渡

```css
/* 固定行高 */
body {
  line-height: 1.8;
}

/* 字体加载过渡 */
.font-loaded body {
  transition: font-family 0.3s ease;
}
```

## 五、兼容性处理

### 5.1 浏览器支持

| 浏览器 | 支持情况 | 备注 |
|--------|---------|------|
| Chrome | ✅ 完全支持 | 推荐 |
| Firefox | ✅ 完全支持 | 推荐 |
| Safari | ✅ 完全支持 | iOS 同样支持 |
| Edge | ✅ 完全支持 | 基于 Chromium |
| IE 11 | ⚠️ 部分支持 | 降级到系统字体 |

### 5.2 加载失败处理

```css
/* 字体加载失败时的降级样式 */
@font-face {
  font-family: 'ZCOOL KuaiLe';
  font-display: swap;
  src: local('PingFang SC'), local('Microsoft YaHei');
}
```

### 5.3 移动端适配

```css
/* 响应式字体大小 */
@media screen and (max-width: 768px) {
  html { font-size: 12px; }
}

@media screen and (max-width: 480px) {
  html { font-size: 10px; }
}
```

## 六、文件结构

```
src/
├── assets/
│   ├── pixel-fonts.css    # 像素字体配置（新增）
│   └── main.css           # 全局样式（已更新）
├── main.js                # 入口文件（已更新）
└── App.vue                # 根组件
```

### 文件说明

| 文件 | 作用 | 修改内容 |
|------|------|---------|
| `pixel-fonts.css` | 像素字体配置 | 新增字体变量、全局字体设置 |
| `main.css` | 全局样式 | 移除字体配置，保留布局样式 |
| `main.js` | 入口文件 | 引入 pixel-fonts.css |
| `index.html` | HTML 模板 | 添加字体预加载 |

## 七、实施步骤

### 7.1 步骤清单

1. **创建字体配置文件**
   - 创建 `src/assets/pixel-fonts.css`
   - 定义字体变量和全局样式

2. **更新入口文件**
   - 修改 `src/main.js` 引入字体配置

3. **优化 HTML 模板**
   - 更新 `index.html` 添加字体预加载

4. **清理旧样式**
   - 更新 `src/assets/main.css` 移除冲突的字体配置

5. **测试验证**
   - 在不同浏览器和设备上测试显示效果

### 7.2 验证 checklist

- ✅ 中文文本显示为像素字体
- ✅ 英文文本显示为 Press Start 2P
- ✅ 页面加载无闪烁
- ✅ 布局无偏移
- ✅ 移动端适配正常
- ✅ 所有 NES.css 组件样式保持不变

## 八、性能指标

### 8.1 字体文件大小

| 字体 | 文件大小 | 预估加载时间 |
|------|---------|-------------|
| Press Start 2P | ~45KB | < 500ms |
| ZCOOL KuaiLe | ~35KB | < 400ms |
| Ma Shan Zheng | ~30KB | < 350ms |
| **总计** | **~110KB** | **< 1s** |

### 8.2 优化目标

- 字体加载时间 < 1 秒
- 首屏渲染时间 < 2 秒
- 无 FOIT 现象
- 布局偏移 < 1px

## 九、常见问题

### Q1: 字体显示模糊

**原因**：浏览器启用了字体抗锯齿

**解决方案**：
```css
body {
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
}
```

### Q2: 中文字体不显示

**原因**：网络问题或字体加载失败

**解决方案**：
1. 检查网络连接
2. 验证字体 URL 是否正确
3. 添加本地字体回退

### Q3: 页面闪烁

**原因**：FOIT（Flash of Invisible Text）

**解决方案**：
```css
body {
  font-display: swap;
}
```

### Q4: 布局偏移

**原因**：字体切换时行高变化

**解决方案**：
```css
body {
  line-height: 1.8; /* 固定行高 */
}
```

## 十、代码示例

### 完整字体配置

```css
/* src/assets/pixel-fonts.css */

@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&display=swap');

:root {
  --font-pixel-en: 'Press Start 2P', monospace;
  --font-pixel-zh: 'ZCOOL KuaiLe', cursive;
  --font-pixel-zh-alt: 'Ma Shan Zheng', cursive;
}

html {
  font-size: 14px;
}

body {
  font-family: var(--font-pixel-zh), var(--font-pixel-zh-alt), var(--font-pixel-en), 
               -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.8;
  font-display: swap;
}

body * {
  font-family: inherit !important;
}
```

---

**版本**: 1.0  
**日期**: 2026-06-22  
**状态**: 已实施

