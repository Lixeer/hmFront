// src/utils/websocket.js

// WebSocket 单例服务
class WebSocketService {
  constructor() {
    this.websocket = null
    this.reconnectTimer = null
    this.reconnectCount = 0
    this.maxReconnectAttempts = 10
    this.minReconnectDelay = 5000
    this.maxReconnectDelay = 60000
    this.callbacks = []
    this.heartbeatTimer = null
    this.heartbeatInterval = 25000 // 心跳发送间隔（略小于后端的30秒）
    this.lastPongTime = Date.now()
    
    // 页面可见性监听
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // 网络状态监听
    this.handleOnline = this.handleOnline.bind(this)
    this.handleOffline = this.handleOffline.bind(this)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  // 获取单例实例
  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  // 获取WebSocket URL
  getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/monitor`
    console.log('WebSocket URL:', wsUrl)
    return wsUrl
  }

  // 连接WebSocket
  connect() {
    // 如果已经连接，先断开
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.warn('WebSocket 已经连接，先断开旧连接')
      this.disconnect()
    }

    const wsUrl = this.getWsUrl()
    
    try {
      console.log('尝试创建 WebSocket 连接...')
      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        console.log('✅ WebSocket 连接已建立')
        this.reconnectCount = 0
        this.lastPongTime = Date.now()
        console.log('⏰ 初始化心跳时间:', new Date(this.lastPongTime).toLocaleTimeString())
        this.startHeartbeat()
        
        // 通知所有回调连接已建立
        this.callbacks.forEach(callback => {
          if (callback.onOpen) {
            callback.onOpen()
          }
        })
      }

      this.websocket.onmessage = (event) => {
        try {
          const payload = event.data
          console.log('📥 收到消息:', payload.length > 50 ? payload.substring(0, 50) + '...' : payload)
          
          // 处理心跳消息
          if (payload === 'ping') {
            console.log('📤 收到服务端 ping，回复 pong')
            this.sendPong()
            return
          }
          
          // 处理心跳响应
          if (payload === 'pong') {
            this.lastPongTime = Date.now()
            console.log('⏰ 收到 pong，更新心跳时间:', new Date(this.lastPongTime).toLocaleTimeString())
            return
          }
          
          // 处理业务消息
          const data = JSON.parse(payload)
          this.lastPongTime = Date.now()
          console.log('📊 收到业务消息，更新心跳时间:', new Date(this.lastPongTime).toLocaleTimeString())
          
          // 通知所有回调有新消息
          this.callbacks.forEach(callback => {
            if (callback.onMessage) {
              callback.onMessage(data)
            }
          })
        } catch (error) {
          console.error('❌ 解析 WebSocket 消息失败:', error)
        }
      }

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error)
        
        // 通知所有回调发生错误
        this.callbacks.forEach(callback => {
          if (callback.onError) {
            callback.onError(error)
          }
        })
      }

      this.websocket.onclose = (event) => {
        console.log('🔌 WebSocket 连接已断开')
        console.log('   - 代码:', event.code)
        console.log('   - 原因:', event.reason)
        console.log('   - 干净关闭:', event.wasClean)
        
        // 停止心跳
        this.stopHeartbeat()
        
        // 通知所有回调连接已断开
        this.callbacks.forEach(callback => {
          if (callback.onClose) {
            callback.onClose(event)
          }
        })
        
        // 自动重连（排除主动关闭的情况）
        if (event.code !== 1000 && this.reconnectCount < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else if (event.code === 1000) {
          console.log('🔌 连接已主动关闭，不进行重连')
        } else if (this.reconnectCount >= this.maxReconnectAttempts) {
          console.log('❌ 已达到最大重连次数，停止重连')
        }
      }
    } catch (error) {
      console.error('❌ 创建 WebSocket 连接失败:', error)
      this.scheduleReconnect()
    }
  }

  // 发送心跳响应
  sendPong() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('📤 发送 pong')
      this.websocket.send('pong')
    } else {
      console.warn('⚠️ 无法发送 pong，连接未打开')
    }
  }

  // 发送心跳（主动发送ping）
  sendPing() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('📤 发送 ping')
      this.websocket.send('ping')
    } else {
      console.warn('⚠️ 无法发送 ping，连接未打开')
    }
  }

  // 启动心跳检测
  startHeartbeat() {
    // 停止之前的心跳定时器
    this.stopHeartbeat()
    
    console.log('❤️ 启动心跳检测，间隔:', this.heartbeatInterval, 'ms')
    
    // 定时发送心跳并检查连接状态
    this.heartbeatTimer = setInterval(() => {
      // 检查是否超时（超过30秒没有收到响应）
      const now = Date.now()
      const elapsed = now - this.lastPongTime
      console.log('⏰ 心跳检查 - 上次响应时间:', new Date(this.lastPongTime).toLocaleTimeString(), '- 已过去:', elapsed, 'ms')
      
      if (elapsed > 30000) {
        console.warn('⏰ 心跳超时（超过30秒），尝试重新连接...')
        this.disconnect()
        this.connect()
        return
      }
      
      // 主动发送心跳
      this.sendPing()
    }, this.heartbeatInterval)
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 安排重连（指数退避）
  scheduleReconnect() {
    // 使用指数退避算法
    const delay = Math.min(
      this.minReconnectDelay * Math.pow(2, this.reconnectCount),
      this.maxReconnectDelay
    )
    
    console.log(`WebSocket 尝试重连 #${this.reconnectCount + 1}，延迟 ${delay}ms...`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++
      this.connect()
    }, delay)
  }

  // 断开连接
  disconnect(code = 1000, reason = '主动关闭') {
    // 停止重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 停止心跳定时器
    this.stopHeartbeat()
    
    // 关闭WebSocket连接
    if (this.websocket) {
      try {
        this.websocket.close(code, reason)
      } catch (e) {
        console.warn('关闭 WebSocket 连接时发生异常:', e)
      }
      this.websocket = null
    }
    
    console.log('WebSocket 连接已主动断开')
  }

  // 注册消息回调
  subscribe(callback) {
    // 检查是否已注册
    const exists = this.callbacks.some(cb => cb.id === callback.id)
    if (!exists) {
      this.callbacks.push(callback)
      console.log('WebSocket 回调已注册:', callback.id)
    }
    
    // 如果已经连接，立即调用 onOpen
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && callback.onOpen) {
      setTimeout(() => callback.onOpen(), 0)
    }
  }

  // 取消注册消息回调
  unsubscribe(callbackId) {
    const index = this.callbacks.findIndex(cb => cb.id === callbackId)
    if (index !== -1) {
      this.callbacks.splice(index, 1)
      console.log('WebSocket 回调已取消注册:', callbackId)
    }
  }

  // 获取连接状态
  getReadyState() {
    if (!this.websocket) return WebSocket.CLOSED
    return this.websocket.readyState
  }

  // 判断是否已连接
  isConnected() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN
  }

  // 页面可见性变化处理
  handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏，减少心跳频率
      console.log('页面已隐藏，WebSocket 保持连接')
    } else {
      // 页面重新可见，检查连接状态
      console.log('页面重新可见，检查 WebSocket 连接...')
      if (!this.isConnected()) {
        console.log('WebSocket 已断开，尝试重新连接...')
        this.connect()
      }
    }
  }

  // 网络恢复处理
  handleOnline() {
    console.log('网络已恢复，检查 WebSocket 连接...')
    if (!this.isConnected()) {
      this.connect()
    }
  }

  // 网络断开处理
  handleOffline() {
    console.log('网络已断开，WebSocket 将在网络恢复后自动重连')
  }

  // 销毁服务
  destroy() {
    // 移除事件监听
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    
    // 断开连接
    this.disconnect()
    
    // 清空回调
    this.callbacks = []
  }
}

// 创建单例
WebSocketService.instance = null

export default WebSocketService
