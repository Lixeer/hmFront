# 病人状态与等级实时同步功能

## 功能概述

实现病人状态与等级的实时同步，确保任何前端用户对病人状态或等级进行修改操作后，更新数据能够实时同步到所有其他已打开病人页面的用户界面中。

## 功能特点

- ✅ **实时同步**：状态/等级修改后立即广播到所有在线用户
- ✅ **双向同步**：支持病人列表页和病人详情页的实时更新
- ✅ **自动重连**：WebSocket 断开后自动尝试重连
- ✅ **数据一致性**：确保所有用户看到相同的病人状态

## 技术实现

### 1. 后端广播机制

**修改文件**：`PatientServiceImpl.java`

**关键代码**：

```java
@Override
public void updatePatientSeverity(Long id, Integer severity) {
    Patient patient = patientMapper.selectById(id);
    if (patient == null) {
        throw new RuntimeException("病人不存在");
    }
    
    UpdateWrapper<Patient> updateWrapper = new UpdateWrapper<>();
    updateWrapper.eq("id", id).set("severity", severity);
    patientMapper.update(null, updateWrapper);

    // 等级改变后广播所有异常病人
    broadcastAbnormalPatients();
}
```

**广播流程**：

```
用户修改状态/等级
        ↓
  更新数据库
        ↓
  查询所有异常病人
        ↓
  序列化为 JSON
        ↓
  WebSocket 广播
        ↓
  所有前端接收更新
```

### 2. 前端 WebSocket 接收

**修改文件**：`PatientDetail.vue`

**关键功能**：

| 功能 | 实现方式 |
|------|---------|
| 连接建立 | 组件挂载时创建 WebSocket 连接 |
| 消息接收 | 监听 `onmessage` 事件 |
| 数据更新 | 解析广播数据，更新当前病人信息 |
| 自动重连 | 连接断开后 5 秒自动重试 |
| 资源清理 | 组件卸载时断开连接 |

**同步流程**：

```
WebSocket 连接建立
        ↓
  接收广播消息
        ↓
  解析 JSON 数据
        ↓
  查找当前病人
        ↓
  更新页面显示
```

## 修改内容

### 后端修改

**文件**：`src/main/java/com/hospital/monitor/service/impl/PatientServiceImpl.java`

**修改位置**：第 97-110 行

**修改内容**：在 `updatePatientSeverity` 方法末尾添加广播调用

```java
// 等级改变后广播所有异常病人
broadcastAbnormalPatients();
```

### 前端修改

**文件**：`src/views/PatientDetail.vue`

**修改内容**：

1. **导入 `onUnmounted`**：
   ```javascript
   import { ref, onMounted, onUnmounted } from 'vue'
   ```

2. **添加 WebSocket 相关变量**：
   ```javascript
   let websocket = null
   let reconnectTimer = null
   const reconnectDelay = 5000
   ```

3. **添加连接方法**：
   ```javascript
   const connectWebSocket = () => { ... }
   ```

4. **添加断开连接方法**：
   ```javascript
   const disconnectWebSocket = () => { ... }
   ```

5. **修改生命周期钩子**：
   ```javascript
   onMounted(() => {
     fetchPatient()
     connectWebSocket()
   })

   onUnmounted(() => {
     disconnectWebSocket()
   })
   ```

## 同步场景

### 场景一：修改病人状态

**用户A操作**：
```
病人列表页 → 点击病人 → 详情页 → 点击"标记为正常"
        ↓
  调用 PUT /api/patients/{id}/status
        ↓
  后端更新数据库
        ↓
  广播异常病人列表
```

**用户B/C看到**：
```
病人列表页自动移除该病人（状态变为正常）
```

### 场景二：修改病人等级

**用户A操作**：
```
病人列表页 → 点击病人 → 详情页 → 修改等级 → 点击"修改等级"
        ↓
  调用 PUT /api/patients/{id}/severity
        ↓
  后端更新数据库
        ↓
  广播异常病人列表
```

**用户B/C看到**：
```
病人列表页等级立即更新
病人详情页等级立即更新（如果已打开）
```

### 场景三：传感器触发状态变更

**传感器发送信号**：
```
POST /api/sensor/signal
        ↓
  后端处理信号
        ↓
  更新病人状态/等级
        ↓
  广播异常病人列表
```

**所有用户看到**：
```
病人列表页自动添加/更新病人
病人详情页自动更新（如果已打开）
```

## 测试验证

### 测试步骤

1. **启动后端服务**：
   ```bash
   cd D:\HM\HostpitalMonitor\patient-monitor
   mvn spring-boot:run
   ```

2. **启动前端服务**：
   ```bash
   cd D:\HM\HospitalMonitorFront\patient-monitor-frontend
   npm run dev
   ```

3. **打开多个浏览器窗口**：
   - 窗口1：访问病人列表页
   - 窗口2：访问同一个病人详情页
   - 窗口3：访问另一个浏览器（如 Chrome 和 Firefox）

4. **执行修改操作**：
   - 在窗口1中修改病人等级
   - 观察窗口2和窗口3是否立即更新

5. **验证实时同步**：
   - ✅ 等级变化立即显示
   - ✅ 状态变化立即显示
   - ✅ 病人从异常列表中移除（标记为正常）

### 验证 Checklist

- ✅ 状态修改实时同步到所有用户
- ✅ 等级修改实时同步到所有用户
- ✅ 病人列表页实时更新
- ✅ 病人详情页实时更新
- ✅ WebSocket 断开自动重连
- ✅ 组件卸载时正确清理连接
- ✅ 原有功能不受影响

## 技术细节

### WebSocket 协议

- **开发环境**：`ws://localhost:3000/ws/monitor`
- **生产环境**：`wss://yourdomain.com/ws/monitor`
- **消息格式**：JSON 数组，包含所有异常病人

### 消息结构

```json
[
  {
    "patient": {
      "id": 1,
      "name": "张三",
      "status": "abnormal",
      "severity": 3,
      "roomNumber": "301"
    },
    "logs": [
      {
        "behaviorType": "跌倒",
        "description": "病人试图下床时跌倒",
        "recordTime": "2024-01-15 10:30:00"
      }
    ]
  }
]
```

### 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| WebSocket 连接失败 | 5秒后自动重连 |
| 消息解析失败 | 记录日志，继续接收下一条消息 |
| 网络中断 | 自动重连机制处理 |

## 性能优化

### 广播策略

- **增量广播**：仅广播异常病人列表（不包含正常病人）
- **批量更新**：每次广播完整列表，客户端自行对比更新
- **心跳检测**：依赖 WebSocket 内置心跳机制

### 资源管理

- **连接复用**：每个浏览器标签页独立连接
- **自动清理**：组件卸载时断开连接
- **重连限制**：无最大重连次数限制（持续尝试）

## 兼容性

### 浏览器支持

| 浏览器 | WebSocket 支持 | 备注 |
|--------|--------------|------|
| Chrome | ✅ | 完全支持 |
| Firefox | ✅ | 完全支持 |
| Safari | ✅ | 完全支持 |
| Edge | ✅ | 完全支持 |
| IE 11 | ⚠️ | 部分支持，建议升级 |

### 网络环境

- ✅ 支持 HTTP/HTTPS
- ✅ 支持代理环境
- ✅ 支持内网穿透

## 总结

✅ **功能已完成实现**

- 后端：所有状态/等级修改操作都会触发广播
- 前端：病人详情页新增 WebSocket 监听
- 同步：病人列表页已支持实时更新（原有功能）
- 兼容：不影响现有功能和接口

---

**实现日期**：2026-06-22  
**实现版本**：v1.2.0  
**状态**：已完成