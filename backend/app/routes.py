from flask import Blueprint, request, jsonify, Response, current_app
from openai import OpenAI
from config import Config
from app.models import db, Conversation
import time
import json
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

main = Blueprint('main', __name__)

@main.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        model = data.get('model', 'deepseek-chat')
        conversation_id = data.get('conversation_id')
        
        # 确保消息历史中只包含必要的字段
        cleaned_messages = [{
            'role': msg['role'],
            'content': msg['content']
        } for msg in messages]
        
        if not cleaned_messages:
            return jsonify({'error': '消息不能为空'}), 400
            
        client = OpenAI(
            api_key=Config.OPENAI_API_KEY,
            base_url="https://api.deepseek.com/v1"
        )

        # 获取应用实例，以便在生成器中使用
        app = current_app._get_current_object()

        def generate():
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=cleaned_messages,
                    temperature=0.7,
                    stream=True,
                    max_tokens=4096
                )
                
                # 收集完整的助手回复
                full_assistant_content = ""
                full_reasoning_content = ""
                
                for chunk in response:
                    try:
                        # 处理思考链内容
                        if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                            content = chunk.choices[0].delta.reasoning_content
                            full_reasoning_content += content
                            yield json.dumps({
                                'type': 'reasoning',
                                'content': content
                            }) + '\n'
                        
                        # 处理主要内容
                        if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_assistant_content += content
                            yield json.dumps({
                                'type': 'content',
                                'content': content
                            }) + '\n'
                            
                    except Exception as chunk_error:
                        print(f"Error processing chunk: {chunk_error}")
                        yield json.dumps({'error': str(chunk_error)}) + '\n'
                
                # 流式响应结束后，将对话保存到数据库
                try:
                    # 创建应用上下文
                    with app.app_context():
                        # 助手回复
                        assistant_reply = {
                            'role': 'assistant',
                            'content': full_assistant_content
                        }
                        
                        # 如果有推理内容，添加到助手回复
                        if full_reasoning_content:
                            assistant_reply['reasoning_content'] = full_reasoning_content
                        
                        # 完整对话历史
                        conversation_messages = cleaned_messages + [assistant_reply]
                        
                        # 保存到数据库
                        if conversation_id:
                            # 更新现有对话
                            conversation = Conversation.query.get(conversation_id)
                            if conversation:
                                conversation.messages = conversation_messages
                                conversation.updated_at = datetime.utcnow()
                            else:
                                # 如果找不到对话，创建新的
                                conversation = Conversation.create_conversation(conversation_messages)
                        else:
                            # 创建新对话
                            conversation = Conversation.create_conversation(conversation_messages)
                        
                        db.session.add(conversation)
                        db.session.commit()
                        
                        # 返回对话ID
                        yield json.dumps({
                            'type': 'conversation_id',
                            'conversation_id': conversation.id
                        }) + '\n'
                    
                except Exception as db_error:
                    print(f"Error saving conversation: {db_error}")
                    yield json.dumps({'error': f"保存对话失败: {str(db_error)}"}) + '\n'
                
            except Exception as e:
                print(f"Error in generate: {e}")
                yield json.dumps({'error': str(e)}) + '\n'
        
        return Response(generate(), mimetype='text/event-stream')
            
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@main.route('/api/conversations', methods=['GET'])
def get_conversations():
    """获取所有对话历史"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # 分页查询所有会话，按更新时间降序排序
        pagination = Conversation.query.order_by(Conversation.updated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        conversations = [conv.to_dict() for conv in pagination.items]
        
        return jsonify({
            'conversations': conversations,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """获取特定对话的历史记录"""
    try:
        conversation = Conversation.query.get(conversation_id)
        if conversation:
            return jsonify(conversation.to_dict())
        return jsonify({'error': '对话不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """删除特定对话"""
    try:
        conversation = Conversation.query.get(conversation_id)
        if conversation:
            db.session.delete(conversation)
            db.session.commit()
            return jsonify({'message': '对话已删除'})
        return jsonify({'error': '对话不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/conversations', methods=['DELETE'])
def clear_conversations():
    """清空所有对话"""
    try:
        Conversation.query.delete()
        db.session.commit()
        return jsonify({'message': '所有对话已清空'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/models', methods=['GET'])
def get_models():
    """获取可用模型列表"""
    models = [
        {
            'id': 'deepseek-chat',
            'name': 'DeepSeek Chat',
            'description': 'DeepSeek 通用对话模型'
        },
        {
            'id': 'deepseek-reasoner',
            'name': 'DeepSeek Reasoner',
            'description': 'DeepSeek 推理增强模型'
        }
    ]
    return jsonify(models)

@main.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})