<template>
  <div class="patient-list-wrapper">
    <!-- 页面最外层容器 -->
    <div class="nes-container with-title is-rounded main-container">
      <p class="title">👥 所有病人监测</p>

      <!-- 导航栏 / 工具栏 -->
      <div class="toolbar">
        <div class="nav-links">
          <router-link to="/" class="nes-btn">⚠️ 异常监测</router-link>
          <router-link to="/all" class="nes-btn is-success">👥 所有病人</router-link>
        </div>
        <button
          type="button"
          class="nes-btn is-primary"
          @click="fetchPatients"
          :disabled="loading"
        >
          刷新
        </button>
        <span class="nes-text is-primary patient-count">
          当前系统人数：{{ patients.length }} 人
        </span>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <div class="nes-container is-dark is-centered">
          <span class="loading-text">加载中...</span>
        </div>
      </div>

      <!-- 无数据提示 -->
      <div v-else-if="!loading && patients.length === 0" class="empty-section">
        <div class="nes-container is-centered empty-container">
          <div class="nes-balloon from-left">
            <p>🎉 系统内暂无病人数据</p>
          </div>
        </div>
      </div>

      <!-- 病人网格列表 -->
      <div v-else class="patient-grid">
        <div
          v-for="item in patients"
          :key="item.id"
          class="nes-container patient-card"
          :class="{
            'is-clickable': true,
            'abnormal-border': item.status === 'abnormal'
          }"
          @click="navigateToDetail(item.id)"
        >
          <!-- 卡片头部信息 -->
          <div class="card-header">
            <span class="patient-name">{{ item.name }}</span>
            <span class="nes-badge is-splited room-badge">
              <span class="is-dark">房号</span>
              <span :class="item.status === 'abnormal' ? 'is-error' : 'is-success'">
                {{ item.roomNumber }}
              </span>
            </span>
          </div>

          <!-- 卡片主要基本资料 -->
          <div class="card-body">
            <div class="meta-info">
              <span class="nes-text is-disabled">{{ item.age }}岁 · {{ item.gender }}</span>
              <span 
                class="nes-badge status-indicator" 
                :class="item.status === 'abnormal' ? 'is-error' : 'is-success'"
              >
                <span>{{ item.status === 'abnormal' ? '异常' : '正常' }}</span>
              </span>
            </div>

            <!-- 星星展示危及程度 -->
            <div class="severity-section" v-if="item.status === 'abnormal'">
              <div class="severity-stars">
                <span
                  v-for="n in 5"
                  :key="n"
                  class="star"
                  :class="{ active: n <= item.severity }"
                >★</span>
              </div>
            </div>
          </div>

          <!-- 核心部分：实时变化的状态栏 -->
          <div class="status-bar-wrapper">
            <div
              class="status-bar"
              :style="{
                backgroundColor: getColorForBehavior(item.activeBehavior),
                color: getContrastColor(item.activeBehavior)
              }"
            >
              <span class="status-bar-text">
                {{ item.activeBehavior ? `🚨 动作: ${item.activeBehavior}` : '💚 状态: 正常无动作' }}
              </span>
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
import WebSocketService from '../utils/websocket'

export default {
  name: 'AllPatients',
  setup() {
    const router = useRouter()
    const patients = ref([])
    const loading = ref(false)
    const webSocketService = WebSocketService.getInstance()
    
    // 生成唯一回调ID
    const callbackId = 'all-patients-' + Date.now()

    // 硬编码的 10 个像素风颜色
    const HARDCODED_COLORS = [
      '#FF5252', // 1. 活力红
      '#448AFF', // 2. 像素蓝
      '#69F0AE', // 3. 护眼绿
      '#FFD740', // 4. 金黄
      '#E040FB', // 5. 亮粉紫
      '#18FFFF', // 6. 青绿
      '#FF6E40', // 8. 橘橙
      '#FF4081', // 7. 亮桃红
      '#7C4DFF', // 9. 魅惑紫
      '#B2FF59'  // 10. 极光绿
    ]

    const behaviorColorMap = ref({})
    const usedColorIndices = ref(new Set())

    // 动态获取行为类型对应的颜色
    const getColorForBehavior = (behavior) => {
      if (!behavior) return '#E0E0E0' // 无动作时使用灰底
      
      // 如果之前映射过，继续使用
      if (behaviorColorMap.value[behavior]) {
        return behaviorColorMap.value[behavior]
      }
      
      // 寻找一个未被使用的颜色
      let colorIndex = -1;
      for (let i = 0; i < HARDCODED_COLORS.length; i++) {
        if (!usedColorIndices.value.has(i)) {
          colorIndex = i;
          break;
        }
      }
      
      // 如果10个颜色均被占用，则循环复用
      if (colorIndex === -1) {
        colorIndex = Object.keys(behaviorColorMap.value).length % HARDCODED_COLORS.length
      }
      
      // 记录映射
      usedColorIndices.value.add(colorIndex)
      const color = HARDCODED_COLORS[colorIndex]
      behaviorColorMap.value[behavior] = color
      return color
    }

    // 根据背景色明度自适应字体颜色 (黑/白)，保障可读性
    const getContrastColor = (behavior) => {
      const bgColor = getColorForBehavior(behavior)
      if (bgColor === '#E0E0E0') return '#000000'
      
      // YIQ 算法计算背景亮度
      const r = parseInt(bgColor.slice(1, 3), 16)
      const g = parseInt(bgColor.slice(3, 5), 16)
      const b = parseInt(bgColor.slice(5, 7), 16)
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
      return yiq >= 128 ? '#000000' : '#ffffff'
    }

    // 拉取所有病人数据
    const fetchPatients = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/patients')
        // 初始化每个病人的活跃动作
        patients.value = (response.data || []).map(p => ({
          ...p,
          activeBehavior: p.status === 'abnormal' ? '异常' : ''
        }))
        
        // 尝试加载最新异常病人中的动作来进行初始化数据融合
        if (webSocketService.isConnected()) {
          // 如果连接已打开，可以通过主动调用获取接口以融合（如果没有最新推送）
          fetchAbnormalDetails()
        }
      } catch (error) {
        console.error('获取所有病人数据失败:', error)
        patients.value = []
      } finally {
        loading.value = false
      }
    }

    // 辅助拉取异常病人明细，进行初始化合并
    const fetchAbnormalDetails = async () => {
      try {
        const response = await axios.get('/api/patients/abnormal')
        const abnormalList = response.data || []
        mergeAbnormalData(abnormalList)
      } catch (e) {
        console.warn('初始化合并异常详情失败:', e)
      }
    }

    // 合并 WebSocket 推送的异常病人列表
    const mergeAbnormalData = (abnormalList) => {
      console.log('开始合并异常数据，当前总人数：', patients.value.length, '，异常推送人数：', abnormalList.length)
      const abnormalMap = new Map()
      abnormalList.forEach(item => {
        if (item && item.patient && item.patient.id !== undefined) {
          const idStr = String(item.patient.id)
          abnormalMap.set(idStr, item)
          console.log(`- 异常Map加入病人: ID=${idStr}, Name=${item.patient.name}`)
        }
      })

      patients.value = patients.value.map(p => {
        const pIdStr = String(p.id)
        const abData = abnormalMap.get(pIdStr)
        if (abData && abData.patient) {
          console.log(`=> 匹配成功: 病人 ID=${pIdStr}, Name=${p.name} -> 状态为异常 (${abData.logs?.[0]?.behaviorType || '无动作'})`)
          return {
            ...p,
            status: 'abnormal',
            severity: abData.patient.severity !== undefined ? abData.patient.severity : p.severity,
            roomNumber: abData.patient.roomNumber || p.roomNumber,
            // 绑定异常动作
            activeBehavior: abData.logs && abData.logs.length > 0 
              ? abData.logs[0].behaviorType 
              : p.activeBehavior || '发生异常'
          }
        } else {
          if (p.status === 'abnormal') {
            console.log(`=> 状态恢复: 病人 ID=${pIdStr}, Name=${p.name} -> 恢复为正常`)
          }
          // 不在异常广播中，恢复为正常状态
          return {
            ...p,
            status: p.status === 'abnormal' ? 'normal' : p.status,
            severity: 0,
            activeBehavior: ''
          }
        }
      })
    }

    const navigateToDetail = (patientId) => {
      router.push(`/patient/${patientId}`)
    }

    // WebSocket 实时推送回调
    const handleMessage = (data) => {
      console.log('WebSocket 收到实时更新信号:', data)
      // 收到推送信号后，延迟 100ms 从后端获取最新已提交的异常列表进行合并，规避事务拉后与单对象推送格式问题
      setTimeout(() => {
        fetchAbnormalDetails()
      }, 100)
    }

    const handleOpen = () => {
      console.log('AllPatients WebSocket 连接已建立')
      fetchAbnormalDetails() // 连上时主动合并一次
    }

    const handleClose = (event) => {
      console.log('AllPatients WebSocket 连接已断开:', event.code, event.reason)
    }

    const handleError = (error) => {
      console.error('AllPatients WebSocket 错误:', error)
    }

    onMounted(() => {
      fetchPatients()
      
      // 注册全局 WebSocket 回调，接收实时监测
      webSocketService.subscribe({
        id: callbackId,
        onMessage: handleMessage,
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError
      })
      
      // 确保 WebSocket 是打开的
      if (!webSocketService.isConnected()) {
        webSocketService.connect()
      }
    })

    onUnmounted(() => {
      // 页面卸载时取消订阅回调
      webSocketService.unsubscribe(callbackId)
    })

    return {
      patients,
      loading,
      fetchPatients,
      navigateToDetail,
      getColorForBehavior,
      getContrastColor
    }
  }
}
</script>

<style scoped>
/* 容器 */
.patient-list-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.main-container {
  background: #fff;
  padding: 1.5rem;
}

/* 导航栏/工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 4px solid #000;
  flex-wrap: wrap;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.patient-count {
  font-size: 0.85rem;
}

/* 加载中 */
.loading-section {
  text-align: center;
  padding: 2rem;
}

.loading-text {
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 无数据提示 */
.empty-section {
  padding: 2rem;
}

.empty-container {
  display: inline-block;
  padding: 1.5rem;
}

/* 病人网格布局 */
.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* 卡片样式 */
.patient-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  margin-bottom: 0;
  transition: transform 0.1s, box-shadow 0.1s;
  border: 4px solid #000;
}

.patient-card.is-clickable {
  cursor: pointer;
}

.patient-card.is-clickable:active {
  transform: translateY(2px);
}

/* 异常状态下的红框警告边框 */
.patient-card.abnormal-border {
  border-color: #e76e55 !important;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  border-bottom: 2px dashed #ccc;
  padding-bottom: 0.5rem;
}

.patient-name {
  font-size: 1.15rem;
  font-weight: bold;
}

.room-badge {
  font-size: 0.7rem;
}

/* 卡片身体 */
.card-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  font-size: 0.65rem;
}

/* 严重程度 */
.severity-section {
  margin-top: 0.25rem;
}

.severity-stars {
  display: flex;
  gap: 0.15rem;
}

.star {
  color: #ccc;
  font-size: 1.1rem;
}

.star.active {
  color: #f7d51d;
  text-shadow: 1.5px 1.5px 0px #000;
}

/* 核心：实时状态栏 */
.status-bar-wrapper {
  margin-top: auto;
}

.status-bar {
  border: 2px solid #000;
  padding: 0.5rem;
  text-align: center;
  box-shadow: 2px 2px 0px #000;
  transition: background-color 0.3s ease, color 0.3s ease;
  min-height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-bar-text {
  font-size: 0.8rem;
  font-weight: bold;
}

/* 移动端适配 */
@media screen and (max-width: 600px) {
  .patient-list-wrapper {
    padding: 8px;
  }

  .main-container {
    padding: 1rem;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .patient-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
