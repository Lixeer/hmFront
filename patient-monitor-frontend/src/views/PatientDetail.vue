<template>
  <div class="patient-detail-wrapper">
    <!-- 页面最外层容器 -->
    <div class="nes-container with-title is-rounded main-container">
      <p class="title">📋 病人详情</p>

      <!-- 顶部导航栏 -->
      <div class="header-bar">
        <button type="button" class="nes-btn" @click="$router.back()">
          ← 返回
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <div class="nes-container is-dark is-centered">
          <i class="nes-icon is-large star is-spinning"></i>
          <span class="loading-text">加载中...</span>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="error" class="error-section">
        <div class="nes-container is-dark is-centered error-container">
          <p class="error-message">{{ error }}</p>
          <button type="button" class="nes-btn is-error" @click="$router.push('/')">
            返回列表
          </button>
        </div>
      </div>

      <!-- 病人详情内容 -->
      <div v-else-if="patient" class="detail-content">

        <!-- 区块一：基本信息 -->
        <section class="nes-container with-title info-section">
          <p class="title">基本资料</p>

          <div class="nes-table-responsive">
            <table class="nes-table is-bordered info-table">
              <tbody>
                <tr>
                  <td class="label-cell">姓名</td>
                  <td>{{ patient.name }}</td>
                </tr>
                <tr>
                  <td class="label-cell">年龄</td>
                  <td>{{ patient.age }} 岁</td>
                </tr>
                <tr>
                  <td class="label-cell">性别</td>
                  <td>{{ patient.gender === 'M' ? '男' : '女' }}</td>
                </tr>
                <tr>
                  <td class="label-cell">房间号</td>
                  <td>{{ patient.roomNumber }}</td>
                </tr>
                <tr>
                  <td class="label-cell">当前状态</td>
                  <td>
                    <span class="nes-badge" :class="patient.status === 'normal' ? 'is-success' : 'is-error'">
                      <span class="is-dark">状态</span>
                      <span :class="patient.status === 'normal' ? 'is-success' : 'is-error'">
                        {{ patient.status === 'normal' ? '正常' : '异常' }}
                      </span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 异常等级单独一行 -->
          <div class="severity-row">
            <span class="severity-label">严重程度：</span>
            <span class="severity-stars">
              <span v-for="n in 5" :key="n" class="star" :class="{ active: n <= patient.severity }">★</span>
            </span>
            <span class="severity-text">× {{ patient.severity }}</span>
            <progress
              class="nes-progress"
              :class="getProgressClass(patient.severity)"
              :value="patient.severity * 20"
              max="100"
            ></progress>
          </div>
        </section>

        <!-- 区块二：最近异常记录 -->
        <section class="nes-container with-title logs-section">
          <p class="title">近期行为记录</p>

          <div v-if="patient.logs && patient.logs.length > 0" class="logs-container">
            <ul class="nes-list is-disc logs-list">
              <li
                v-for="(log, index) in patient.logs"
                :key="index"
                class="log-item"
              >
                <span :class="log.isAbnormal ? 'nes-text is-error' : 'nes-text is-success'">
                  [{{ log.isAbnormal ? '异常' : '正常' }}]
                </span>
                <strong class="log-type">{{ log.behaviorType }}</strong>
                <span class="log-desc">— {{ log.description }}</span>
                <br>
                <small class="nes-text is-disabled log-time">{{ formatTime(log.recordTime) }}</small>
              </li>
            </ul>
          </div>

          <div v-else class="empty-logs">
            <div class="nes-container is-dark is-centered">
              <p class="nes-text is-disabled">暂无行为记录</p>
            </div>
          </div>
        </section>

        <!-- 区块三：操作区 -->
        <section class="nes-container with-title actions-section">
          <p class="title">操作</p>

          <div class="actions-row">
            <!-- 标记为正常按钮 -->
            <button
              v-if="patient.status !== 'normal'"
              type="button"
              class="nes-btn is-success action-btn"
              @click="markAsNormal"
              :disabled="updating"
            >
              ✔ 恢复正常
            </button>

            <!-- 修改等级区域 -->
            <div class="severity-control">
              <div class="nes-select">
                <select v-model.number="selectedSeverity" :disabled="updatingSeverity">
                  <option :value="0">0 级</option>
                  <option :value="1">1 级</option>
                  <option :value="2">2 级</option>
                  <option :value="3">3 级</option>
                  <option :value="4">4 级</option>
                  <option :value="5">5 级</option>
                </select>
              </div>
              <button
                type="button"
                class="nes-btn is-warning"
                @click="updateSeverity"
                :disabled="updatingSeverity || selectedSeverity === patient.severity"
              >
                修改等级
              </button>
            </div>
          </div>

          <!-- 提示消息 -->
          <div v-if="showMessage" class="message-section">
            <div class="nes-balloon from-left" :class="messageType === 'success' ? 'is-success' : 'is-error'">
              <p>{{ messageText }}</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'PatientDetail',
  setup() {
    const route = useRoute()
    const patient = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const updating = ref(false)
    const updatingSeverity = ref(false)
    const selectedSeverity = ref(0)
    const showMessage = ref(false)
    const messageText = ref('')
    const messageType = ref('success')
    let messageTimer = null

    const fetchPatient = async () => {
      loading.value = true
      error.value = null
      try {
        const patientId = route.params.id
        const response = await axios.get(`/api/patients/${patientId}`)
        const data = response.data
        patient.value = {
          ...data.patient,
          logs: data.logs || []
        }
        selectedSeverity.value = patient.value.severity || 0
      } catch (err) {
        console.error('获取病人详情失败:', err)
        if (err.response && err.response.status === 404) {
          error.value = '病人不存在'
        } else {
          error.value = '加载失败，请稍后重试'
        }
      } finally {
        loading.value = false
      }
    }

    const displayMessage = (text, type = 'success') => {
      messageText.value = text
      messageType.value = type
      showMessage.value = true

      if (messageTimer) {
        clearTimeout(messageTimer)
      }

      messageTimer = setTimeout(() => {
        showMessage.value = false
      }, 2000)
    }

    const markAsNormal = async () => {
      updating.value = true
      try {
        const patientId = route.params.id
        await axios.put(`/api/patients/${patientId}/status`, {
          status: 'normal'
        })
        displayMessage('✅ 状态已更新', 'success')
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } catch (err) {
        console.error('标记失败:', err)
        displayMessage('❌ 操作失败', 'error')
      } finally {
        updating.value = false
      }
    }

    const updateSeverity = async () => {
      updatingSeverity.value = true
      try {
        const patientId = route.params.id
        await axios.put(`/api/patients/${patientId}/severity`, {
          severity: selectedSeverity.value
        })
        patient.value.severity = selectedSeverity.value
        displayMessage('✅ 等级已更新', 'success')
      } catch (err) {
        console.error('更新等级失败:', err)
        displayMessage('❌ 更新失败', 'error')
        selectedSeverity.value = patient.value.severity || 0
      } finally {
        updatingSeverity.value = false
      }
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
      fetchPatient()
    })

    return {
      patient,
      loading,
      error,
      updating,
      updatingSeverity,
      selectedSeverity,
      showMessage,
      messageText,
      messageType,
      markAsNormal,
      updateSeverity,
      formatTime,
      getProgressClass
    }
  }
}
</script>

<style scoped>
/* 页面最外层 */
.patient-detail-wrapper {
  max-width: 600px;
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

/* 顶部导航栏 */
.header-bar {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 4px solid #000;
}

.header-bar .nes-btn {
  font-size: 0.875rem;
}

/* 加载状态 */
.loading-section {
  text-align: center;
  padding: 2rem;
}

.loading-section .nes-container {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.loading-text {
  animation: blink 1.5s infinite;
  font-size: 1rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 错误提示 */
.error-section {
  padding: 2rem;
}

.error-container {
  text-align: center;
  padding: 1.5rem;
}

.error-message {
  font-size: 1rem;
  margin-bottom: 1rem;
}

/* 详情内容 */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-content .nes-container {
  margin: 0;
}

.detail-content .nes-container > .title {
  font-size: 1rem;
  color: #209cee;
}

/* 基本信息区块 */
.info-table {
  width: 100%;
  margin-bottom: 1rem;
}

.info-table td {
  padding: 0.5rem;
  font-size: 0.875rem;
}

.label-cell {
  width: 30%;
  font-weight: bold;
  background: #f5f5f5;
}

.severity-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem;
  background: #f5f5f5;
  border: 2px solid #000;
}

.severity-label {
  font-weight: bold;
  font-size: 0.875rem;
}

.severity-stars {
  display: flex;
  gap: 0.125rem;
}

.star {
  font-size: 1rem;
  color: #ccc;
}

.star.active {
  color: #f7d51d;
  text-shadow: 2px 2px 0px #000;
}

.severity-text {
  font-weight: bold;
  font-size: 0.875rem;
}

.severity-row .nes-progress {
  flex: 1;
  min-width: 100px;
  max-width: 200px;
  height: 1rem;
}

/* 行为记录区块 */
.logs-container {
  max-height: 50vh;
  overflow-y: auto;
  padding: 0.5rem;
}

.logs-list {
  font-size: 0.875rem;
}

.logs-list li {
  padding: 0.5rem 0;
  border-bottom: 2px dashed #ccc;
}

.logs-list li:last-child {
  border-bottom: none;
}

.log-type {
  color: #333;
  margin: 0 0.25rem;
}

.log-desc {
  color: #666;
}

.log-time {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
}

.empty-logs .nes-container {
  padding: 1rem;
}

/* 操作区块 */
.actions-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
}

.severity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.severity-control .nes-select {
  min-width: 100px;
}

.severity-control select {
  font-size: 0.875rem;
  padding: 0.5rem;
}

/* 提示消息 */
.message-section {
  margin-top: 1rem;
}

.message-section .nes-balloon {
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  display: inline-block;
}

.message-section .nes-balloon.is-success {
  background: #92cc41;
  border-color: #76c442;
}

.message-section .nes-balloon.is-error {
  background: #e76e55;
  border-color: #ce372b;
}

/* 响应式 */
@media screen and (max-width: 480px) {
  .patient-detail-wrapper {
    padding: 8px;
  }

  .main-container {
    padding: 1rem;
  }

  .main-container > .title {
    font-size: 1.25rem;
  }

  .actions-row {
    flex-direction: column;
    align-items: stretch;
  }

  .action-btn {
    width: 100%;
  }

  .severity-control {
    width: 100%;
    justify-content: space-between;
  }

  .severity-control .nes-select {
    flex: 1;
  }

  .severity-control .nes-btn {
    flex-shrink: 0;
  }

  .severity-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .severity-row .nes-progress {
    width: 100%;
    max-width: none;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .nes-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px #000 !important;
  }
}
</style>
