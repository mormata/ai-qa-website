import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'

export function useChat() {
  const md = new MarkdownIt()
  const messages = ref([])
  const apiMessages = ref([])
  const inputMessage = ref('')
  const loading = ref(false)
  const chatContainerRef = ref(null)
  const currentModel = ref('deepseek-chat')
  const isMobileMenuOpen = ref(false)
  const currentStreamingMessage = ref('')
  const currentReasoningContent = ref('')
  const conversations = ref([])
  const currentConversationId = ref(null) // 当前对话ID
  const loadingConversations = ref(false) // 加载对话列表状态
  const isMobileView = ref(window.innerWidth <= 768) // 窗口大小检测

  const modelOptions = [
    { label: 'DeepSeek Chat', value: 'deepseek-chat' },
    { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' }
  ]

  // 自动滚动到底部
  const scrollToBottom = async () => {
    await nextTick()
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  }

  // 渲染 markdown
  const renderMarkdown = (content) => {
    return md.render(content || '')
  }

  // 处理流式响应
  const handleStreamResponse = async (response) => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulatedData = ''
    
    // 重置当前消息和思考链
    currentStreamingMessage.value = ''
    currentReasoningContent.value = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedData += chunk

        try {
          const lines = accumulatedData.split('\n').filter(line => line.trim())
          accumulatedData = ''

          for (const line of lines) {
            const data = JSON.parse(line)
            if (data.error) {
              ElMessage.error(data.error)
              continue
            }

            // 处理思考链内容
            if (data.type === 'reasoning') {
              currentReasoningContent.value += data.content
              const lastMessage = messages.value[messages.value.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.reasoning_content = currentReasoningContent.value
              }
            } 
            // 处理主要内容
            else if (data.type === 'content') {
              currentStreamingMessage.value += data.content
              const lastMessage = messages.value[messages.value.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                // 强制更新内容
                lastMessage.content = currentStreamingMessage.value
                // 避免批量更新造成的打字效果消失
                await nextTick()
              }
            }
            // 处理会话ID
            else if (data.type === 'conversation_id') {
              currentConversationId.value = data.conversation_id
              console.log('Conversation saved with ID:', currentConversationId.value)
            }
          }
          // 移至循环外，减少频繁滚动
          await scrollToBottom()
        } catch (e) {
          console.error('Error processing chunk:', e)
          continue
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      throw error
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.value.trim()) {
      ElMessage.warning('请输入消息')
      return
    }

    const userMessage = inputMessage.value.trim()
    
    // 创建用户消息对象
    const userMessageObj = {
      role: 'user',
      content: userMessage
    }
    
    // 添加到显示消息
    messages.value.push(userMessageObj)
    
    // 规范化消息历史，确保严格遵循user-assistant交替模式
    const normalizeMessages = (msgs) => {
      if (msgs.length === 0) return [userMessageObj]
      
      const result = []
      let lastRole = null
      
      // 处理历史消息
      for (const msg of msgs) {
        // 如果与上一条消息角色相同，合并内容
        if (msg.role === lastRole) {
          const lastMsg = result[result.length - 1]
          lastMsg.content += '\n\n' + msg.content
        } else {
          result.push({
            role: msg.role,
            content: msg.content
          })
          lastRole = msg.role
        }
      }
      
      // 确保最后一条消息是用户消息
      if (result.length > 0 && result[result.length - 1].role === 'user') {
        // 已经是用户消息，直接使用
        return result
      } else {
        // 添加新的用户消息
        return [...result, userMessageObj]
      }
    }
    
    // 为API请求准备消息历史，确保符合交替模式
    const cleanedMessages = normalizeMessages(apiMessages.value)
    
    inputMessage.value = ''
    loading.value = true
    currentStreamingMessage.value = ''
    currentReasoningContent.value = ''
    
    // 添加空的助手消息占位（仅用于显示）
    messages.value.push({
      role: 'assistant',
      content: '',
      reasoning_content: currentModel.value === 'deepseek-reasoner' ? '' : null
    })
    
    await scrollToBottom()

    try {
      console.log('Sending messages to API:', cleanedMessages)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: cleanedMessages,
          model: currentModel.value,
          conversation_id: currentConversationId.value // 传入当前对话ID
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || error.error || '请求失败')
      }

      await handleStreamResponse(response)
      
      // 将助手的回复添加到API消息历史
      apiMessages.value = [...cleanedMessages, {
        role: 'assistant',
        content: currentStreamingMessage.value,
        ...(currentReasoningContent.value ? { reasoning_content: currentReasoningContent.value } : {})
      }]
      
      // 更新对话列表
      await loadConversations()
      
    } catch (error) {
      console.error('Error:', error)
      ElMessage.error(error.message)
      messages.value.pop() // 移除空的助手消息
    } finally {
      loading.value = false
    }
  }

  // 加载所有对话
  const loadConversations = async () => {
    try {
      loadingConversations.value = true
      const response = await fetch('/api/conversations')
      if (!response.ok) {
        throw new Error('Failed to load conversations')
      }
      const data = await response.json()
      conversations.value = data.conversations || []
    } catch (error) {
      console.error('Error loading conversations:', error)
      ElMessage.error('加载对话历史失败')
    } finally {
      loadingConversations.value = false
    }
  }

  // 加载特定对话
  const loadConversation = async (conversationId) => {
    try {
      loading.value = true
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) {
        throw new Error('Failed to load conversation')
      }
      const data = await response.json()
      
      // 设置当前对话ID
      currentConversationId.value = conversationId
      
      // 设置消息
      messages.value = data.messages
      apiMessages.value = data.messages
      
      ElMessage.success('对话加载成功')
      await nextTick()
      await scrollToBottom()
    } catch (error) {
      console.error('Error loading conversation:', error)
      ElMessage.error('加载对话失败')
    } finally {
      loading.value = false
    }
  }

  // 删除对话
  const deleteConversation = async (conversationId) => {
    try {
      loading.value = true
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }
      
      // 如果删除的是当前对话，则清空当前对话
      if (conversationId === currentConversationId.value) {
        clearChat()
      }
      
      // 更新对话列表
      await loadConversations()
      ElMessage.success('对话已删除')
    } catch (error) {
      console.error('Error deleting conversation:', error)
      ElMessage.error('删除对话失败')
    } finally {
      loading.value = false
    }
  }

  const clearChat = () => {
    messages.value = []
    apiMessages.value = [] // 清空API消息历史
    isMobileMenuOpen.value = false
    currentConversationId.value = null // 清空当前对话ID
    
    // 添加初始欢迎消息（仅用于显示，不加入API历史）
    messages.value.push({
      role: 'assistant',
      content: '你好！我是 AI 助手，有什么我可以帮你的吗？'
    })
  }

  onMounted(() => {
    clearChat()
    loadConversations() // 加载对话列表
    
    // 添加窗口大小监听
    window.addEventListener('resize', () => {
      isMobileView.value = window.innerWidth <= 768
      if (!isMobileView.value) {
        // 如果切换到桌面视图，关闭移动菜单
        isMobileMenuOpen.value = false
      }
    })
  })

  // 在 useChat.js 中添加重试函数
  const fetchWithRetry = async (url, options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return response
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  return {
    messages,
    inputMessage,
    loading,
    chatContainerRef,
    currentModel,
    isMobileMenuOpen,
    currentStreamingMessage,
    currentReasoningContent,
    modelOptions,
    sendMessage,
    clearChat,
    renderMarkdown,
    fetchWithRetry,
    conversations,
    currentConversationId,
    loadingConversations,
    loadConversations,
    loadConversation,
    deleteConversation,
    isMobileView  // 确保这个存在
  }
}