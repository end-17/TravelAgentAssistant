<template>
  <div class="page-container chat-page">
    <div class="page-header">
      <van-nav-bar
        title="AI 旅游助手"
        left-arrow
        left-text="返回"
        @click-left="onBack"
      />
    </div>
    <div class="chat-container" ref = "chatContainer">
      <div v-if="messages.length === 0" class="chat-empty">
        <van-empty
          description="开始和AI助手对话吧!"
        />
        <div class="quick-questions">
          <div class="quick-title">常见问题</div>
          <van-tag 
          @click = "handleClickTag(q)" 
          v-for = "q in quickQuestions" :key="q" 
          size="large" mark class="quick-tag">
            {{ q }}
          </van-tag>
        </div>
      </div>
      <div v-else class="message-list">
        <ChatBubble v-for="msg in messages" :key="msg.id" :message="msg"/>
        <div class="tool-indicator" v-if="toolStatus">
          <van-loading type="spinner" size="16px" />
          <span>{{ toolStatus }}</span>
        </div>
        <div class="streaming-indicator" v-else-if="isStreaming">
          <van-loading type="spinner" size="20px" />
          <span>AI正在思考中...</span>
        </div>
      </div>
    </div>
    <div class="chat-input-area">
      <van-field
      v-model="inputMessage"
      placeholder="请输入您的问题"
      :disabled="isStreaming"
      @keyup.enter="sendMessage"
      >
        <template #button>
          <van-button 
          @click="sendMessage" 
          type="primary" size="small" 
          :disabled="!inputMessage.trim()">
          发送
        </van-button>
        </template>
      </van-field>
    </div>
  </div>
</template>

<script setup>
  import {ref, onMounted} from 'vue'
  import {useRouter, useRoute} from 'vue-router'
  import {showToast} from 'vant'
  import {fetchStream, get} from '../utils/request.js'
  import ChatBubble from '../components/ChatBubble.vue'
  const router = useRouter()
  const chatContainer = ref(null)
  const onBack = () => {
    router.back()
  }
  // 会话数据
  const messages = ref([])
  // 会话ID：localStorage 持久化，刷新页面后按它从后端恢复历史
  const SESSION_KEY = 'travel_chat_session_id'
  const sessionId = ref(localStorage.getItem(SESSION_KEY) || '')
  // 用户输入的信息
  const inputMessage = ref('')
  const quickQuestions = ref([
    '北京有哪些必去的景点？',
    '上海美食推荐',
    '成都三日游攻略',
    '如何选择旅行保险？'
  ])
  // AI是否正在输出
  const isStreaming = ref(false)
  // 工具调用状态，如"正在查询天气(get_weather)..."，为空表示无工具调用
  const toolStatus = ref('')

  const scrollToBottom = () => {
    if(chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }
  const handleClickTag = (q) => {
    inputMessage.value = q
  }

  const sendMessage = () => {
    const msg = inputMessage.value.trim()
    if(!msg || isStreaming.value) {
      return
    }
    addUserMessage(msg)
    inputMessage.value = ''
    fetchAIResponse(msg)
  }
  // 将用户发送的消息添加到消息列表中
  const addUserMessage = (content) => {
    // 先添加用户消息
    messages.value.push({
      id: Date.now(),
      role: 'user',
      content,
      timestamp:new Date().toISOString()
    })
  }
  // 通过流式请求获取 AI 的响应，并实时更新到消息列表
  const fetchAIResponse = (userMsg) => {
    // 禁用输入框
    isStreaming.value = true
    // 在消息列表末尾添加一条空的 AI 消息，占据位置
    messages.value.push({
      id:Date.now() + 1,
      role: 'ai',
      content: '',
      timestamp: new Date().toISOString()
    })
    // 创建 fullResponse 用于累积完整回复
    let fullResponse = ''
    // 调用 fetchStream 发起请求，走 Agent 接口，模型可自主调用天气/景点工具
    // 携带 sessionId 让后端把本轮消息挂到对应会话下，实现多轮上下文
    fetchStream('agent-chat',{message: userMsg, sessionId: sessionId.value},(chunk) => {
      // 收到文本流说明工具调用已结束，清空工具状态
      toolStatus.value = ''
      // 每收到一块数据（ chunk ），拼接到 fullResponse ，并更新最后一条消息的内容
      fullResponse += chunk
      const lastMsg = messages.value[messages.value.length - 1]
      if(lastMsg && lastMsg.role === 'ai') {
        lastMsg.content = fullResponse
      }
      scrollToBottom()
    },() => {
      // AI返回完成
      isStreaming.value = false
      toolStatus.value = ''
      scrollToBottom()
    },(errMsg) => {
      const lastMsg = messages.value[messages.value.length - 1]
      if(lastMsg && lastMsg.role === 'ai') {
        lastMsg.content = `抱歉,AI发生错误:${errMsg}`
      }
      isStreaming.value = false
      toolStatus.value = ''
      showToast('AI回复失败')
      scrollToBottom()
    },{
      // 后端创建新会话后会第一时间推 session 帧，持久化 sessionId
      onSession: (id) => {
        sessionId.value = id
        localStorage.setItem(SESSION_KEY, id)
      },
      // 工具调用状态回调：模型决定调用工具时触发
      onTool: (toolInfo) => {
        const toolNameMap = {
          'get_weather': '查询天气',
          'search_spot': '搜索景点'
        }
        const label = toolNameMap[toolInfo.tool] || toolInfo.tool
        toolStatus.value = toolInfo.status === 'calling' ? `正在${label}...` : ''
        scrollToBottom()
      }
    })
  }

  // 从路由 query 预填问题；若本地已有 sessionId，则从后端恢复历史消息
  const route = useRoute()
  onMounted(async () => {
    if(route.query.scene === 'detail' && route.query.city){
      inputMessage.value = `我想了解一下${route.query.city}的旅游景点`
    }
    if(sessionId.value){
      try{
        const res = await get('/history', {sessionId: sessionId.value})
        if(res && res.success && res.messages && res.messages.length){
          // 后端存的 role 是 user/assistant，前端气泡组件用 user/ai，做一次映射
          messages.value = res.messages.map(m => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'ai',
            content: m.content,
            timestamp: new Date(m.created_at).toISOString()
          }))
          scrollToBottom()
        }
      }catch(err){
        // 历史恢复失败不影响正常使用，清空无效 sessionId
        sessionId.value = ''
        localStorage.removeItem(SESSION_KEY)
      }
    }
  })
</script>

<style scoped>
.page-header {
  height: 46px;
}
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: 0px !important;
}

.chat-container {
  height:650px;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 60px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.quick-questions {
  margin-top: 32px;
  text-align: center;
}

.quick-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.quick-tag {
  margin: 8px;
  cursor: pointer;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #999;
  font-size: 14px;
}

.tool-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #1989fa;
  font-size: 14px;
}

.chat-input-area {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: #fff;
  padding: 8px 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  max-width: 750px;
  margin: 0 auto;
}

.chat-input-area :deep(.van-field) {
  background: #f7f8fa;
  border-radius: 20px;
  padding: 8px 16px;
}
</style>
