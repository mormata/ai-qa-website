# AI问答网站

这是一个基于Vue 3和Flask的AI问答网站，集成了DeepSeek API来提供智能问答服务。

## 项目结构
```
ai-qa-website/
├── frontend/ # 前端代码
│ ├── public/ # 公共静态资源
│ │ ├── favicon.ico # 网站图标
│ │ └── index.html # HTML模板
│ ├── src/
│ │ ├── assets/ # 静态资源
│ │ ├── composables/ # 可复用的组合式函数
│ │ │ └── useChat.js # 聊天核心逻辑(API调用、消息处理等)
│ │ ├── styles/ # 样式文件
│ │ │ ├── app.css # 应用全局样式(布局、侧边栏)
│ │ │ ├── chat.css # 聊天界面样式(消息、输入框)
│ │ │ └── sidebar.css # 侧边栏样式增强
│ │ ├── App.vue # 根组件
│ │ └── main.js # 入口文件
│ ├── package.json # 前端项目依赖配置
│ └── vite.config.js # Vite配置
│
├── backend/ # 后端代码
│ ├── app/ # 应用主目录
│ │ ├── init.py # 应用初始化(创建Flask应用)
│ │ ├── models.py # 数据库模型(对话历史存储)
│ │ └── routes.py # API路由(聊天、对话管理等)
│ ├── config.py # 配置文件(API密钥、数据库等)
│ ├── .env # 环境变量(存储API密钥)
│ ├── requirements.txt # 依赖列表
│ └── run.py # 应用启动入口
│
└── README.md # 项目说明
```

## 技术栈
- 前端：Vue 3 + Vite + Element Plus
- 后端：Flask + Python
- AI API：DeepSeek API

## 开发环境要求
- Node.js >= 16
- Python >= 3.8
- npm 或 yarn

## 安装步骤

### 前端设置
```bash
cd frontend
npm install
npm run dev
```

### 后端设置
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows使用: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
### 修改API_KEY
修改backend->.env文件中的OPENAI_API_KEY=YOUR_OPENAI_API_KEY