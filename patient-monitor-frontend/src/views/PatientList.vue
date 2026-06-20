<template>
  <div class="patient-list-wrapper">
    <!-- 页面最外层容器 -->
    <div class="nes-container with-title is-rounded main-container">
      <p class="title">🏥 异常病人监测</p>

      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <button
          type="button"
          class="nes-btn is-primary"
          @click="fetchPatients"
          :disabled="loading"
        >
          刷新
        </button>
        <span class="nes-text is-primary patient-count">
          当前异常人数：{{ patients.length }} 人
        </span>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <div class="nes-container is-dark is-centered">
          <span class="loading-text">加载中...</span>
        </div>
      </div>

      <!-- 无异常病人提示 -->
      <div v-else-if="!loading && patients.length === 0" class="empty-section">
        <div class="nes-container is-centered empty-container">
          <div class="nes-balloon from-left">
            <p>🎉 当前无异常病人</p>
          </div>
        </div>
      </div>

      <!-- 病人列表 -->
      <div v-else class="patient-list">
        <div
          v-for="item in patients"
          :key="item.patient.id"
          class="nes-container"
          :class="{
            'is-dark': item.patient.severity >= 4,
            'is-clickable': true
          }"
          @click="navigateToDetail(item.patient.id)"
        >
          <div class="patient-row">
            <!-- 左侧：病人基本信息 -->
            <div class="patient-info">
              <div class="info-header">
                <span class="patient-name">{{ item.patient.name }}</span>
                <span class="nes-badge is-splited room-badge">
                  <span class="is-dark">房</span>
                  <span class="is-success">{{ item.patient.roomNumber }}</span>
                </span>
              </div>

              <div class="severity-section">
                <div class="severity-stars">
                  <span
                    v-for="n in 5"
                    :key="n"
                    class="star"
                    :class="{ active: n <= item.patient.severity }"
                  >★</span>
                </div>
                <progress
                  class="nes-progress"
                  :class="getProgressClass(item.patient.severity)"
                  :value="item.patient.severity * 20"
                  max="100"
                ></progress>
              </div>

              <div class="patient-meta">
                <span class="nes-text is-disabled">
                  {{ item.patient.age }}岁 · {{ item.patient.gender === 'M' ? '男' : '女' }}
                </span>
              </div>
            </div>

            <!-- 右侧：最近异常描述 -->
            <div class="patient-log" v-if="item.logs && item.logs.length > 0">
              <div class="nes-balloon from-right log-balloon">
                <p class="log-type">{{ item.logs[0].behaviorType }}</p>
                <p class="log-desc">{{ item.logs[0].description }}</p>
                <p class="nes-text is-disabled log-time">{{ formatTime(item.logs[0].recordTime) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'PatientList',
  setup() {
    const router = useRouter()
    const patients = ref([])
    const loading = ref(false)
    let websocket = null
    let reconnectTimer = null
    const reconnectDelay = 5000

    const fetchPatients = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/patients/abnormal')
        patients.value = response.data || []
      } catch (error) {
        console.error('获取异常病人数据失败:', error)
        patients.value = []
      } finally {
        loading.value = false
      }
    }

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/ws/monitor`

      try {
        websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
          console.log('WebSocket 连接已建立')
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
        }

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // 后端广播的是完整的异常病人列表 [{patient, logs}, ...]
            if (Array.isArray(data)) {
              patients.value = data
              console.log('WebSocket 更新异常病人列表，共', data.length, '人')
            }
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error)
          }
        }

        websocket.onerror = (error) => {
          console.error('WebSocket 错误:', error)
        }

        websocket.onclose = () => {
          console.log('WebSocket 连接已断开，5秒后尝试重连...')
          websocket = null

          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              console.log('尝试重新连接 WebSocket...')
              connectWebSocket()
            }, reconnectDelay)
          }
        }
      } catch (error) {
        console.error('创建 WebSocket 连接失败:', error)
      }
    }

    const disconnectWebSocket = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }

      if (websocket) {
        websocket.close()
        websocket = null
        console.log('WebSocket 连接已主动断开')
      }
    }

    const navigateToDetail = (patientId) => {
      router.push(`/patient/${patientId}`)
    }

    const formatTime = (time) => {
      if (!time) return ''
      const date = new Date(time)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getProgressClass = (severity) => {
      if (severity >= 4) return 'is-error'
      if (severity >= 2) return 'is-warning'
      return 'is-success'
    }

    onMounted(() => {
      fetchPatients()
      connectWebSocket()
    })

    onUnmounted(() => {
      disconnectWebSocket()
    })

    return {
      patients,
      loading,
      fetchPatients,
      navigateToDetail,
      formatTime,
      getProgressClass
    }
  }
}
</script>

<style scoped>
/* 页面最外层 */
.patient-list-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.main-container {
  background: #fff;
  padding: 1.5rem;
}

.main-container > .title {
  font-size: 1.5rem;
  color: #209cee;
  text-shadow: 3px 3px 0px #000;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 4px solid #000;
}

.patient-count {
  font-size: 1rem;
  font-weight: bold;
}

/* 加载状态 */
.loading-section {
  text-align: center;
  padding: 2rem;
}

.loading-text {
  animation: blink 1.5s infinite;
  font-size: 1rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 无异常提示 */
.empty-section {
  padding: 2rem;
}

.empty-container {
  display: inline-block;
  padding: 1.5rem;
}

.empty-container .nes-balloon {
  font-size: 1.2rem;
}

/* 病人列表 */
.patient-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.patient-list > .nes-container {
  padding: 1rem;
  margin-bottom: 0;
  transition: transform 0.1s;
}

.patient-list > .nes-container.is-dark {
  background: #212932;
  color: #fff;
}

.patient-list > .nes-container.is-dark .nes-text.is-disabled {
  color: #787878;
}

.patient-list > .nes-container.is-clickable {
  cursor: pointer;
}

.patient-list > .nes-container.is-clickable:active {
  transform: translateY(2px);
}

/* 左右两列布局 */
.patient-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

/* 左侧：病人信息 */
.patient-info {
  flex: 1;
  min-width: 200px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.patient-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: inherit;
}

.room-badge {
  font-size: 0.75rem;
}

/* 异常等级 */
.severity-section {
  margin-bottom: 0.5rem;
}

.severity-stars {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.star {
  font-size: 1rem;
  color: #ccc;
}

.star.active {
  color: #f7d51d;
  text-shadow: 2px 2px 0px #000;
}

.nes-progress {
  height: 1rem;
  width: 100%;
  max-width: 200px;
}

.patient-meta {
  font-size: 0.875rem;
}

/* 右侧：异常描述 */
.patient-log {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: flex-start;
}

.log-balloon {
  max-width: 100%;
}

.log-type {
  font-weight: bold;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: inherit;
}

.log-desc {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: inherit;
}

.log-time {
  font-size: 0.75rem;
  margin-bottom: 0;
}

/* 响应式：小屏幕上下堆叠 */
@media screen and (max-width: 600px) {
  .patient-list-wrapper {
    padding: 8px;
  }

  .main-container {
    padding: 1rem;
  }

  .main-container > .title {
    font-size: 1.25rem;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .patient-count {
    font-size: 0.875rem;
  }

  .patient-row {
    flex-direction: column;
  }

  .patient-info,
  .patient-log {
    min-width: 100%;
  }

  .patient-log {
    margin-top: 0.5rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .patient-list > .nes-container:hover {
    transform: none;
  }
}
</style>
