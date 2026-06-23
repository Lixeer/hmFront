# WebSocket 连接频繁断开问题分析与修复

## 问题现象

前端页面中 WebSocket 连接总是频繁断开，表现为：
- 连接建立后很快断开
- 断开后尝试重连，但很快又断开
- 日志显示大量"连接已断开，5秒后尝试重连"

## 问题根因分析

### 原因一：心跳响应缺失

**后端配置**：
- 后端每30秒发送一次 `ping` 心跳消息
- 期望客户端回复 `pong` 响应
- 如果超过120秒没有收到响应，后端会主动断开连接

**前端问题**：
- 前端没有处理 `ping` 消息
- 没有回复 `pong` 响应
- 后端认为客户端超时，主动断开连接

```java
// 后端心跳检测逻辑
private void checkTimeouts() {
    long now = System.currentTimeMillis();
    SESSIONS.forEach((id, session) -> {
        Long lastActive = LAST_ACTIVITY.get(id);
        if (lastActive != null && (now - lastActive) > SESSION_TIMEOUT * 1000) {
            log.warn("客户端 {} 超时，断开连接", id);
            removeSession(id);
        }
    });
}
```

### 原因二：重复连接问题

**原实现问题**：
- 每个页面组件独立创建 WebSocket 连接
- 页面切换时可能创建多个连接
- 组件卸载时断开连接，但可能存在竞态条件

### 原因三：缺少网络状态感知

**原实现问题**：
- 没有监听网络状态变化
- 没有监听页面可见性变化
- 浏览器后台时连接可能被节流

## 解决方案

### 1. 创建统一的 WebSocket 单例服务

**文件**：`src/utils/websocket.js`

**核心功能**：

| 功能 | 说明 |
|------|------|
| 单例模式 | 全局唯一连接，避免重复连接 |
| 心跳响应 | 自动回复 pong 响应 |
| 心跳检测 | 主动发送 ping 检测连接状态 |
| 指数退避 | 重连间隔指数增长，避免频繁重试 |
| 页面可见性 | 监听 visibilitychange 事件 |
| 网络状态 | 监听 online/offline 事件 |
| 回调管理 | 支持多个组件订阅/取消订阅 |

### 2. 心跳机制实现

```javascript
// 收到后端 ping 消息时回复 pong
if (payload === 'ping') {
  this.sendPong()
  return
}

// 收到 pong 响应时更新时间戳
if (payload === 'pong') {
  this.lastPongTime = Date.now()
  return
}

// 定时检测连接状态
this.heartbeatTimer = setInterval(() => {
  // 超过30秒没有响应则重新连接
  if (Date.now() - this.lastPongTime > 30000) {
    this.disconnect()
    this.connect()
    return
  }
  // 主动发送心跳
  this.sendPing()
}, 25000)
```

### 3. 指数退避重连策略

```javascript
// 重连间隔指数增长
const delay = Math.min(
  this.minReconnectDelay * Math.pow(2, this.reconnectCount),
  this.maxReconnectDelay
)

// 重连间隔序列：5s → 10s → 20s → 40s → 60s → 60s...
```

### 4. 页面可见性处理

```javascript
handleVisibilityChange() {
  if (document.hidden) {
    console.log('页面已隐藏')
  } else {
    // 页面重新可见时检查连接
    if (!this.isConnected()) {
      this.connect()
    }
  }
}
```

### 5. 更新组件使用统一服务

**PatientList.vue 和 PatientDetail.vue 修改**：

```javascript
// 导入统一服务
import WebSocketService from '../utils/websocket'

// 获取单例实例
const webSocketService = WebSocketService.getInstance()

// 注册回调
webSocketService.subscribe({
  id: callbackId,
  onMessage: handleMessage,
  onOpen: handleOpen,
  onClose: handleClose,
  onError: handleError
})

// 取消注册
webSocketService.unsubscribe(callbackId)
```

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/utils/websocket.js` | 新增统一 WebSocket 单例服务 |
| `src/views/PatientList.vue` | 使用统一服务，移除独立连接逻辑 |
| `src/views/PatientDetail.vue` | 使用统一服务，移除独立连接逻辑 |

## 修复效果

### 修复前
```
WebSocket 连接已断开，5秒后尝试重连...
尝试重新连接 WebSocket...
WebSocket 连接已断开，5秒后尝试重连...
尝试重新连接 WebSocket...
```

### 修复后
```
WebSocket 连接已建立
收到心跳响应
收到心跳响应
收到心跳响应
```

## 测试验证

### 测试步骤

1. **启动服务**
   ```bash
   # 后端
   cd D:\HM\HostpitalMonitor\patient-monitor
   mvn spring-boot:run
   
   # 前端
   cd D:\HM\HospitalMonitorFront\patient-monitor-frontend
   npm run dev
   ```

2. **打开页面**
   - 访问 http://localhost:3001/
   - 打开浏览器开发者工具（F12）
   - 查看 Console 日志

3. **验证连接稳定性**
   - ✅ 连接建立后保持稳定
   - ✅ 心跳消息正常收发
   - ✅ 页面切换不影响连接
   - ✅ 页面隐藏后恢复正常

4. **验证重连功能**
   - 断开网络 → 等待重连
   - 恢复网络 → 自动重连成功

### 验证 Checklist

- ✅ WebSocket 连接稳定，不再频繁断开
- ✅ 心跳消息正确收发（ping/pong）
- ✅ 页面切换时连接保持
- ✅ 页面可见性变化时正确处理
- ✅ 网络状态变化时正确处理
- ✅ 指数退避重连策略生效

## 技术细节

### 心跳时序图

```
客户端                    服务端
  |                         |
  |----(连接建立)----------->|
  |                         |
  |<---(ping)---------------|  每30秒
  |----(pong)-------------->|  立即回复
  |                         |
  |----(ping)-------------->|  每25秒（主动检测）
  |<---(pong)---------------|
  |                         |
```

### 连接状态机

```
          connect()
             ↓
    ┌─────────────────┐
    │    CONNECTING   │
    └────────┬────────┘
             │ onopen
             ↓
    ┌─────────────────┐
    │      OPEN       │◄───────────────────────┐
    └────────┬────────┘                        │
             │ onclose / timeout               │
             ↓                                 │
    ┌─────────────────┐                        │
    │    CLOSING      │                        │
    └────────┬────────┘                        │
             │ closed                          │
             ↓                                 │
    ┌─────────────────┐                        │
    │     CLOSED      │─────scheduleReconnect()┘
    └─────────────────┘
```

### 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 心跳间隔 | 25秒 | 客户端主动发送 ping |
| 超时时间 | 30秒 | 无响应则重连 |
| 最小重连延迟 | 5秒 | 首次重连延迟 |
| 最大重连延迟 | 60秒 | 最大重连延迟 |
| 最大重连次数 | 10次 | 防止无限重试 |

## 常见问题

### Q1: 连接还是断开？

**检查步骤**：
1. 确认后端服务正常运行
2. 检查浏览器 Console 是否有错误
3. 确认网络连接正常
4. 检查防火墙是否阻止 WebSocket 端口

### Q2: 心跳响应是否生效？

**验证方法**：
1. 打开浏览器开发者工具
2. 切换到 Network → WS
3. 查看是否有 ping/pong 消息
4. 确认 pong 消息在 ping 之后立即发送

### Q3: 页面切换后连接断开？

**原因**：原实现每个组件独立管理连接

**解决方案**：使用统一的单例服务

## 总结

✅ **问题已修复**

**根本原因**：前端没有回复后端的心跳消息（ping→pong），导致后端认为客户端超时并断开连接。

**修复方案**：
1. 创建统一的 WebSocket 单例服务
2. 实现完整的心跳机制（ping/pong）
3. 添加页面可见性和网络状态监听
4. 实现指数退避重连策略
5. 更新所有组件使用统一服务

---

**修复日期**：2026-06-23  
**修复版本**：v1.3.0  
**状态**：已完成并验证