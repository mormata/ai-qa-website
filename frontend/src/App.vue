<script setup>
import { useChat } from './composables/useChat'
import { ref } from 'vue'
import './styles/app.css'
import './styles/chat.css'
// 导入需要的图标
import { ArrowLeft, ArrowRight, Plus, Delete, Close, Menu } from '@element-plus/icons-vue'

const {
  messages,
  inputMessage,
  loading,
  chatContainerRef,
  currentModel,
  isMobileMenuOpen,
  modelOptions,
  conversations,
  loadingConversations,
  currentConversationId,
  sendMessage,
  clearChat,
  renderMarkdown,
  loadConversation,
  deleteConversation,
  isMobileView
} = useChat()

// 添加侧边栏折叠状态
const isSidebarCollapsed = ref(false)

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 关闭移动端侧边栏
const closeMobileSidebar = () => {
  if (isMobileView) {
    isMobileMenuOpen.value = false
  }
}

// 获取当前对话的标题
const getCurrentConversationTitle = () => {
  if (!currentConversationId.value || !conversations.value.length) return '新对话'
  
  const currentConv = conversations.value.find(conv => conv.id === currentConversationId.value)
  return currentConv ? currentConv.title : '新对话'
}
</script>

<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <aside :class="['sidebar', { 
      'collapsed': isSidebarCollapsed, 
      'mobile-open': isMobileMenuOpen 
    }]">
      <!-- 侧边栏切换按钮 (仅桌面端显示) -->
      <button v-if="!isMobileView" class="toggle-sidebar-btn" @click="toggleSidebar">
        <el-icon :size="14">
          <arrow-right v-if="isSidebarCollapsed" />
          <arrow-left v-else />
        </el-icon>
      </button>
      
      <!-- 侧边栏内容 -->
      <div class="sidebar-content" :class="{ 'hidden': isSidebarCollapsed }">
        <div class="sidebar-header">
          <h2>AI 助手</h2>
        </div>
        
        <button class="new-chat-btn" @click="clearChat">
          <el-icon :size="14">
            <plus />
          </el-icon>
          <span v-if="!isSidebarCollapsed">新对话</span>
        </button>
        
        <!-- 历史对话列表 -->
        <div class="conversations-list" v-if="!isSidebarCollapsed">
          <h3>历史对话</h3>
          <div v-if="loadingConversations" class="loading-spinner">
            加载中...
          </div>
          <template v-else>
            <div v-if="conversations.length === 0" class="no-conversations">
              暂无历史对话
            </div>
            <div 
              v-for="conv in conversations" 
              :key="conv.id" 
              :class="['conversation-item', { active: currentConversationId === conv.id }]"
              @click="loadConversation(conv.id); closeMobileSidebar()"
            >
              <div class="conversation-title">{{ conv.title }}</div>
              <div class="conversation-actions">
                <button class="delete-btn" @click.stop="deleteConversation(conv.id)">
                  <el-icon :size="14">
                    <delete />
                  </el-icon>
                </button>
              </div>
            </div>
          </template>
        </div>
        
        <!-- 模型选择器 -->
        <div class="model-selector" v-if="!isSidebarCollapsed">
          <label>选择模型</label>
          <el-select v-model="currentModel" class="model-select">
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
    </aside>
    
    <!-- 移动端侧边栏遮罩层 -->
    <div class="sidebar-backdrop" v-if="isMobileMenuOpen" @click="isMobileMenuOpen = false"></div>

    <!-- 主要内容区 -->
    <div class="main-wrapper">
      <main class="main-content">
        <!-- 修改标题栏部分 -->
        <div class="page-header">
          <div class="header-content">
            <!-- 移动端菜单按钮 -->
            <button class="mobile-menu-btn" v-if="isMobileView" @click="isMobileMenuOpen = !isMobileMenuOpen">
              <el-icon :size="20"><Menu /></el-icon>
            </button>
            
            <!-- 只在有当前对话时显示标题 -->
            <h1 class="site-title" v-if="currentConversationId && conversations.length">
              {{ getCurrentConversationTitle() }}
            </h1>
            <h1 class="site-title" v-else>
              新对话
            </h1>
            
            <!-- 移除右侧的操作按钮部分 -->
            <div class="header-actions"></div>
          </div>
        </div>

        <!-- 聊天区域 -->
        <div class="chat-container" ref="chatContainerRef">
         <div class="chat-main">
          <div v-for="(message, index) in messages" 
               :key="index" 
               :class="['message', message.role]">
            <div class="message-wrapper">
              <template v-if="message.role === 'assistant'">
                <div class="message-content-with-avatar">
                  <div class="avatar">🤖</div>
                  <div class="content-wrapper">
                    <!-- 思维链内容 -->
                    <div v-if="currentModel === 'deepseek-reasoner' && message.reasoning_content" 
                         class="reasoning-content">
                      <div class="reasoning-header">
                        <el-icon :size="14">
                          <arrow-left />
                        </el-icon>
                        思考过程
                      </div>
                      <div class="reasoning-body" v-html="renderMarkdown(message.reasoning_content)"></div>
                    </div>
                    <!-- 主要内容 -->
                    <div class="message-content" v-html="renderMarkdown(message.content)"></div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="message-content user-message" v-html="renderMarkdown(message.content)"></div>
              </template>
            </div>
          </div>
          
          <!-- 加载指示器 -->
          <div v-if="loading" class="message assistant">
            <div class="message-content-with-avatar">
              <div class="avatar">🤖</div>
              <div class="message-content loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-container">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="1"
              placeholder="输入消息..."
              :disabled="loading"
              @keyup.enter.exact="sendMessage"
              @keyup.enter.shift.exact="inputMessage += '\n'"
              resize="none"
              autosize
              class="chat-input"
            >
            </el-input>
            <el-button 
              type="primary" 
              :loading="loading"
              @click="sendMessage"
              class="send-button"
            >
              发送
            </el-button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>