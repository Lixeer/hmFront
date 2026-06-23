# WebSocket 连接问题分析与解决方案

## 问题描述

WebSocket 连接频繁断开，错误码 **1006**（异常关闭）

## 根本原因

### 1. **SockJS 协议冲突** ❌

原配置使用了 `.withSockJS()`，这会启用 SockJS 协议。SockJS 是一种 WebSocket 降级方案，但 Vite 的 WebSocket 代理不支持 SockJS 协议，导致握手失败。

### 2. **Tomcat 空闲超时** ❌

Tomcat 默认的 WebSocket Session 空闲超时为 60 秒，超时后会主动断开连接。

### 3. **前端代理配置不完善** ❌

Vite 的 WebSocket 代理配置缺少必要的超时和请求头设置。

## 已实施的修复方案

### 1. 移除 SockJS 配置

**文件**: `src/main/java/com/hospital/monitor/config/WebSocketConfig.java`

```java
// 移除 .withSockJS()
registry.addHandler(monitorWebSocketHandler, "/ws/monitor")
        .setAllowedOriginPatterns("*")  // 允许所有来源
        .addInterceptors(...);
```

**原因**: Vite 代理不支持 SockJS 协议，需要使用原生 WebSocket。

### 2. 设置 Session 空闲超时为无限

**文件**: `src/main/java/com/hospital/monitor/websocket/MonitorWebSocketHandler.java`

```java
@Override
public void afterConnectionEstablished(WebSocketSession session) {
    // 设置 WebSocket Session 超时时间为无限（-1）
    session.setIdleTimeout(-1);
    // ...
}
```

**原因**: 防止 Tomcat 60 秒超时断开连接。

### 3. 优化 Vite WebSocket 代理配置

**文件**: `vite.config.js`

```javascript
proxy: {
  '/ws': {
    target: 'ws://localhost:8080',
    ws: true,
    changeOrigin: true,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    },
    proxyTimeout: 60000,
    timeout: 60000
  }
}
```

**原因**: 确保 WebSocket 升级请求头正确传递，设置合理的超时时间。

## 测试步骤

1. 确保后端服务已重启
2. 启动前端项目：`npm run dev`
3. 打开浏览器访问 http://localhost:3000/
4. 打开浏览器开发者工具（F12）
5. 切换到 Console 标签
6. 观察 WebSocket 连接日志

## 预期结果

成功连接后应该看到以下日志：

```
✅ WebSocket 连接已建立
❤️ 启动心跳检测，间隔: 25000 ms
⏰ 初始化心跳时间: 10:30:45
```

心跳日志（每 25 秒）：

```
📤 发送 ping
📥 收到消息: pong
⏰ 收到 pong，更新心跳时间: 10:31:10
```

## 注意事项

- 如果仍然出现 1006 错误，请检查：
  1. 浏览器控制台的详细错误信息
  2. 后端控制台是否有 "WebSocket 握手前/后" 的日志
  3. 网络代理或防火墙设置
- 建议使用 Chrome DevTools 的 Network 标签查看 WebSocket 连接的详细信息
- 如果使用手机访问，确保在同一局域网内

## 参考资料

- [Spring WebSocket 文档](https://docs.spring.io/spring-framework/reference/web/websocket.html)
- [Vite dev server proxy 配置](https://vitejs.dev/config/server-options.html#server-proxy)
- [WebSocket 错误码说明](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)
