# AI问答网站

这是一个基于Vue 3和Flask的AI问答网站，集成了DeepSeek API来提供智能问答服务。

## 项目结构
```
frontend/
├── src/
│   ├── assets/             # 静态资源
│   ├── composables/        # 可复用的组合式函数
│   │   └── useChat.js      # 聊天核心逻辑
│   ├── styles/             # 样式文件
│   │   ├── app.css         # 应用全局样式
│   │   └── chat.css        # 聊天界面样式
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
└── package.json            # 项目依赖配置
└── README.md               # 项目说明
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