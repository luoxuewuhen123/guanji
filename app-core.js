// ==================== DataCleaner ====================
// 与Python版 chat_parser.py DataCleaner 完全对齐
class DataCleaner {
    constructor() {
        // 用户别名配置：这些名字出现时 = "我"（解决聊天记录用真名代替"我"的情况）
        // 可通过 setSelfNames() 动态更新
        this._selfNames = new Set(['我']);

        // 媒体标记列表
        this.MEDIA_MARKERS = new Set([
            '[图片]', '[语音]', '[语音通话]', '[视频通话]', '[视频]', '[文件]',
            '[位置]', '[红包]', '[名片]', '[视频号]', '[小程序]', '[群公告]',
            '[转账]', '[拍一拍]', '[链接]', '[表情]', '[动画表情]',
            '[聊天记录]', '[引用]', '[回复]', '[礼物]', '[分享]', '[文件/链接]',
            '[合并转发]',
        ]);
        // 加密消息标记
        this.ENCRYPTED_MARKERS = new Set(['[加密消息]', '[解析失败]', '[消息已撤回]']);
        // 系统/状态消息（精确匹配）
        this.SYSTEM_STATUS_MESSAGES = new Set([
            '视频通话未接听', '语音通话未接听', '已在其他设备处理',
            '已转其他设备通话', '请求添加你为好友', '通话已结束',
            '通话时长', '已取消', '对方已拒绝', '对方忙碌中',
            '对方无应答', '通话中', '正在通话中',
        ]);
        // 系统消息关键词（包含匹配——消息中含这些词则视为系统消息）
        this.SYSTEM_KEYWORDS = [
            '位置共享已经结束', '位置共享已结束',
            '你已添加了', '以上是打招呼的消息',
            '撤回了一条消息',
        ];
        // 系统消息前缀
        this.SYSTEM_PREFIXES = ['---', '===', '***'];
        // 撤回消息关键词（短行内含撤回关键词 = 系统消息）
        this.RECALL_KEYWORDS = ['撤回了一条消息'];
        // 机器人/客服标识
        this.BOT_IDENTIFIERS = ['@openim', '@kefu', 'openim', 'kefu'];
        // 系统对话名称（文件传输助手、文件助手等，不是真实对话）
        this.SYSTEM_CONVERSATION_NAMES = ['文件传输助手', '文件助手', '文件传输', '微信团队', '系统消息', 'System Messages', '我的电脑', '我的手机', 'My Computer', 'My Phone'];
        // 最低有效消息数
        this.MIN_MESSAGES = 4;
        
        this.stats = {
            messages_filtered_media: 0,
            messages_filtered_system: 0,
            messages_filtered_encrypted: 0,
            messages_filtered_empty: 0,
            messages_filtered_unknown_media: 0,
            conversations_filtered_blacklist: 0,
            conversations_filtered_bot: 0,
            conversations_filtered_low_count: 0,
            conversations_filtered_no_valid: 0,
            blacklist_names: [],
        };
    }
    
    // 判断消息是否有效（与Python版 is_valid_message 对齐）
    is_valid_message(content) {
        if (!content || !content.trim()) {
            this.stats.messages_filtered_empty++;
            return false;
        }
        content = content.trim();
        
        // 加密消息
        if (this.ENCRYPTED_MARKERS.has(content)) {
            this.stats.messages_filtered_encrypted++;
            return false;
        }
        // 系统/状态消息（精确匹配）
        if (this.SYSTEM_STATUS_MESSAGES.has(content)) {
            this.stats.messages_filtered_system++;
            return false;
        }
        // 系统消息关键词（包含匹配——短消息中含系统关键词则过滤）
        if (content.length < 60) {
            for (const kw of this.SYSTEM_KEYWORDS) {
                if (content.includes(kw)) {
                    this.stats.messages_filtered_system++;
                    return false;
                }
            }
        }
        // 未知媒体类型 [类型XXX]
        if (/^\[(?:类型|媒体类型)\d+\]$/.test(content)) {
            this.stats.messages_filtered_unknown_media++;
            return false;
        }
        // 带时长/大小的媒体标记，如 [语音15″] [语音1'30″] [视频2'15″] 等
        // Unicode引号全覆盖：′(U+2032) '(U+0027) ″(U+2033) "(U+0022)
        if (/^\[(?:语音|视频)\d+['\u2032]?\d*["\u2033]?\]$/.test(content)) {
            this.stats.messages_filtered_media++;
            return false;
        }
        // 检查是否全由[xxx]标记组成（可能多个标记混合）
        const parts = content.split(/\s+/);
        if (parts.length > 0 && parts.every(p =>
            this.MEDIA_MARKERS.has(p) || /^\[(?:类型|媒体类型)\d+\]$/.test(p) || /^\[(?:语音|视频)\d+['\u2032]?\d*["\u2033]?\]$/.test(p)
        )) {
            this.stats.messages_filtered_media++;
            return false;
        }
        // 单个媒体标记（与Python版对齐的冗余检查）
        if (this.MEDIA_MARKERS.has(content)) {
            this.stats.messages_filtered_media++;
            return false;
        }
        return true;
    }
    
    // 判断是否为系统消息行
    is_system_message(line) {
        line = line.trim();
        for (const prefix of this.SYSTEM_PREFIXES) {
            if (line.startsWith(prefix)) {
                this.stats.messages_filtered_system++;
                return true;
            }
        }
        // 撤回消息（短行内含撤回关键词 = 系统消息）
        if (line.length < 40) {
            for (const kw of this.RECALL_KEYWORDS) {
                if (line.includes(kw)) {
                    this.stats.messages_filtered_system++;
                    return true;
                }
            }
        }
        return false;
    }
    
    // 判断对话是否为机器人/客服（不再按关键词过滤，借贷/中介对话同样有价值）
    is_blacklisted_conversation(chatName, filename = '') {
        const checkText = `${chatName} ${filename}`.toLowerCase();
        // 机器人/客服标识
        for (const id of this.BOT_IDENTIFIERS) {
            if (checkText.includes(id.toLowerCase())) {
                this.stats.conversations_filtered_bot++;
                this.stats.blacklist_names.push(chatName);
                return true;
            }
        }
        // 系统对话名称（文件传输助手、文件助手等）
        for (const name of this.SYSTEM_CONVERSATION_NAMES) {
            if (chatName.includes(name)) {
                this.stats.conversations_filtered_blacklist++;
                this.stats.blacklist_names.push(chatName);
                return true;
            }
        }
        return false;
    }
    
    getStats() {
        return { ...this.stats };
    }

    // 设置"我"的别名列表（如 ["我","春艳","翁宗艳"]）
    setSelfNames(names) {
        if (!names || !names.length) return;
        // 追加而非替换，确保"我"始终在列表中
        for (const n of names.map(n => n.trim()).filter(Boolean)) {
            this._selfNames.add(n);
        }
    }

    // 判断发送者名字是否属于"我"（包括别名）
    isSelfSender(senderName) {
        return this._selfNames.has(senderName);
    }
}

// ==================== ChatParser ====================
// 与Python版 WechatParser + QQParser 对齐
class ChatParser {
    constructor(cleaner) {
        this.cleaner = cleaner || new DataCleaner();
        this.conversations = [];  // 每个文件=一个对话
    }

    // 判断发送者是否为"我"（支持别名配置）
    _isMe(senderName) {
        return this.cleaner.isSelfSender(senderName);
    }
    
    // 从文件名提取聊天对象名（与Python版对齐）
    _extractChatName(filename) {
        let namePart = filename.replace(/\.(txt|json|csv|md)$/i, '');
        if (namePart.includes('_')) {
            // 取最后一个下划线前的部分作为名称（Python: namePart.rsplit('_', 1)[0]）
            const lastIdx = namePart.lastIndexOf('_');
            return namePart.substring(0, lastIdx);
        }
        return namePart;
    }
    
    // 解析微信JSON文件（与Python版 parse_cleaned_json 对齐）
    parseWechatJson(text, filename) {
        const chatName = this._extractChatName(filename);
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            return null;
        }
        
        const friendName = data.friend_name || chatName;
        const wxid = data.wxid || '';
        const isGroup = wxid.includes('@chatroom');
        
        const messages = [];
        for (const msgData of (data.messages || [])) {
            const msgType = msgData.type || 'message';
            if (msgType === 'system' || msgType !== 'message') continue;
            
            const content = (msgData.content || '').trim();
            if (!this.cleaner.is_valid_message(content)) continue;
            
            const isMe = !!msgData.is_me;
            const senderName = isMe ? '我' : (msgData.sender || friendName);
            const timestamp = this._parseTimestamp(msgData.time);
            
            messages.push({
                source: 'wechat',
                sender: isMe ? 'me' : 'other',
                sender_name: senderName,
                content: content,
                timestamp: timestamp,
                chat_with: friendName,
                chat_type: isGroup ? 'group' : 'private',
                is_me: isMe
            });
        }
        
        return { chat_with: friendName, messages, source: 'wechat', chat_type: isGroup ? 'group' : 'private' };
    }
    
    // 解析微信TXT文件（与Python版 parse_txt 对齐）
    parseWechatTxt(text, filename) {
        const chatName = this._extractChatName(filename);
        const lines = text.split('\n');
        const messages = [];
        let currentMsg = null;
        
        for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line.trim()) continue;
            
            // 跳过文件头
            if (line.startsWith('#') || line.startsWith('===')) continue;
            
            // 系统消息行
            if (this.cleaner.is_system_message(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                currentMsg = null;
                continue;
            }
            // 带[时间戳]的 --- xxx --- 系统消息
            if (/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s+---/.test(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                this.cleaner.stats.messages_filtered_system++;
                currentMsg = null;
                continue;
            }
            
            // 格式2：[YYYY-MM-DD HH:MM:SS] 发送者: 内容
            const matchNew = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+?)[:：]\s*(.*)/);
            if (matchNew) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderName = matchNew[2].trim();
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'wechat', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: matchNew[3].trim(),
                    timestamp: this._parseTimestamp(matchNew[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 格式3：[YYYY-MM-DD HH:MM:SS] 发送者 [媒体类型]（无冒号）
            const matchMedia = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+)\s+(\[[^\]]+\])\s*$/);
            if (matchMedia) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderName = matchMedia[2].trim();
                const mediaTag = matchMedia[3].trim();
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'wechat', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: mediaTag,
                    timestamp: this._parseTimestamp(matchMedia[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 格式1：YYYY-MM-DD HH:MM:SS 发送者（旧格式，内容在后续行）
            const matchOld = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)/);
            if (matchOld) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderName = matchOld[2].trim();
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'wechat', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: '',
                    timestamp: this._parseTimestamp(matchOld[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 续行内容
            // 检查续行是否为系统消息（包括带时间戳的: [时间] --- xxx ---）
            if (this.cleaner.is_system_message(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                currentMsg = null;
                continue;
            }
            // 带[时间戳]的 --- xxx --- 系统消息
            if (/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s+---/.test(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                this.cleaner.stats.messages_filtered_system++;
                currentMsg = null;
                continue;
            }
            if (currentMsg) {
                currentMsg.content = currentMsg.content ? currentMsg.content + '\n' + line : line;
            }
        }
        
        // 保存最后一条
        if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
            messages.push(currentMsg);
        }
        
        return { chat_with: chatName, messages, source: 'wechat', chat_type: 'private' };
    }
    
    // 解析QQ TXT文件（与Python版 QQParser.parse_txt 对齐）
    parseQQTxt(text, filename) {
        const chatName = this._extractChatName(filename);
        const lines = text.split('\n');
        const messages = [];
        let currentMsg = null;
        
        for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line.trim()) continue;
            
            // 跳过文件头
            if (line.startsWith('#') || line.startsWith('===')) continue;
            
            // 格式1：[YYYY-MM-DD HH:MM:SS] 发送者: 内容
            const matchNew = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+?)[:：]\s*(.*)/);
            if (matchNew) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderInfo = matchNew[2].trim();
                const { senderName } = this._parseQQSender(senderInfo);
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'qq', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: matchNew[3].trim(),
                    timestamp: this._parseTimestamp(matchNew[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 格式3：[YYYY-MM-DD HH:MM:SS] 发送者 [媒体类型]（无冒号）
            const matchMedia = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+)\s+(\[[^\]]+\])\s*$/);
            if (matchMedia) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderInfo = matchMedia[2].trim();
                const { senderName } = this._parseQQSender(senderInfo);
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'qq', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: matchMedia[3].trim(),
                    timestamp: this._parseTimestamp(matchMedia[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 格式2：YYYY-MM-DD HH:MM:SS 昵称(QQ号)
            const matchOld = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+?)(?:\((\d+)\))?\s*$/);
            if (matchOld) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                const senderName = matchOld[2].trim();
                const isMe = this._isMe(senderName);
                currentMsg = {
                    source: 'qq', sender: isMe ? 'me' : 'other',
                    sender_name: senderName, content: '',
                    timestamp: this._parseTimestamp(matchOld[1]),
                    chat_with: chatName, chat_type: 'private', is_me: isMe
                };
                continue;
            }
            
            // 续行
            // 检查续行是否为系统消息（与Python版QQParser对齐）
            if (this.cleaner.is_system_message(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                currentMsg = null;
                continue;
            }
            // 带[时间戳]的 --- xxx --- 系统消息
            if (/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s+---/.test(line)) {
                if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                this.cleaner.stats.messages_filtered_system++;
                currentMsg = null;
                continue;
            }
            if (currentMsg) {
                currentMsg.content = currentMsg.content ? currentMsg.content + '\n' + line : line;
            }
        }
        
        if (currentMsg && this.cleaner.is_valid_message(currentMsg.content)) {
            messages.push(currentMsg);
        }
        
        return { chat_with: chatName, messages, source: 'qq', chat_type: 'private' };
    }
    
    // 解析QQ发送者信息
    _parseQQSender(senderInfo) {
        // 格式: 昵称(QQ号) 或 QQ123456 或 纯昵称
        const match = senderInfo.match(/^(.+?)\((\d+)\)$/);
        if (match) {
            return { senderName: match[1].trim(), senderQQ: match[2] };
        }
        return { senderName: senderInfo, senderQQ: '' };
    }
    
    // 解析时间戳（增强版：支持多种格式）
    _parseTimestamp(tsStr) {
        if (!tsStr) return null;
        try {
            // 方法1：直接解析（支持 ISO 8601 和常见格式）
            const normalized = tsStr.replace(/\//g, '-').replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '').trim();
            const d = new Date(normalized);
            if (!isNaN(d.getTime())) return d.getTime();
            
            // 方法2：解析中文格式 "YYYY年MM月DD日 HH:mm:ss"
            const chineseMatch = tsStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
            if (chineseMatch) {
                const d2 = new Date(parseInt(chineseMatch[1]), parseInt(chineseMatch[2])-1, parseInt(chineseMatch[3]),
                              parseInt(chineseMatch[4]), parseInt(chineseMatch[5]), parseInt(chineseMatch[6]));
                if (!isNaN(d2.getTime())) return d2.getTime();
            }
            
            // 方法3：解析 "YYYYMMDD HHmmss" 格式
            const compactMatch = tsStr.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})/);
            if (compactMatch) {
                const d3 = new Date(parseInt(compactMatch[1]), parseInt(compactMatch[2])-1, parseInt(compactMatch[3]),
                              parseInt(compactMatch[4]), parseInt(compactMatch[5]), parseInt(compactMatch[6]));
                if (!isNaN(d3.getTime())) return d3.getTime();
            }
            
            // 方法4：Unix时间戳（秒或毫秒）
            const ts = parseInt(tsStr);
            if (!isNaN(ts)) {
                return ts > 1e12 ? ts : ts * 1000;
            }
        } catch(e) {}
        return null;
    }

    // ========== AI聊天记录解析（增量同步用）==========

    /**
     * 解析AI聊天记录文件 — 自动识别格式
     * 支持：
     * 1. ChatGPT 导出 JSON (conversations[].mapping[].message)
     * 2. ChatGPT 导出 JSONL (每行一个JSON: {role, content})
     * 3. Claude 导出 JSON ({conversation: [{role, content}]})
     * 4. 通用人机对话 TXT ([时间] 发送者: 内容)
     * 5. Markdown 对话格式
     */
    parseAIChat(text, filename) {
        const trimmed = text.trim();
        if (!trimmed) return null;

        // 尝试1: JSON格式
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const data = JSON.parse(trimmed);
                const result = this._parseAIChatJSON(data, filename);
                if (result && result.messages.length > 0) return result;
            } catch(e) { /* 不是有效JSON，继续尝试其他格式 */ }
        }

        // 尝试2: JSONL格式（每行一个JSON）
        if (trimmed.includes('\n')) {
            const jsonlResult = this._parseAIChatJSONL(trimmed, filename);
            if (jsonlResult && jsonlResult.messages.length > 0) return jsonlResult;
        }

        // 尝试3: 纯文本对话格式
        const txtResult = this._parseAIChatTXT(trimmed, filename);
        if (txtResult && txtResult.messages.length > 0) return txtResult;

        return null;
    }

    _parseAIChatJSON(data, filename) {
        const messages = [];

        // ChatGPT导出格式：{ conversations: [{ mapping: { id: { message: { content: { parts: ["..."] }, author: { role: "..." } } } } }] }
        if (data.conversations && Array.isArray(data.conversations)) {
            for (const conv of data.conversations) {
                if (!conv.mapping || typeof conv.mapping !== 'object') continue;
                for (const [msgId, node] of Object.entries(conv.mapping)) {
                    if (!node || !node.message) continue;
                    const msg = node.message;
                    const content = msg.content;

                    // 提取文本内容
                    let textContent = '';
                    if (content && content.parts && Array.isArray(content.parts)) {
                        textContent = content.parts.filter(p => typeof p === 'string').join('\n');
                    } else if (typeof content === 'string') {
                        textContent = content;
                    }

                    if (!textContent || !this.cleaner.is_valid_message(textContent)) continue;

                    // 判断角色
                    const role = (msg.author && msg.author.role) || 'unknown';
                    const isMe = (role === 'user' || role === 'human' || role === 'you');
                    const senderName = isMe ? '我' : 'AI';

                    messages.push({
                        source: 'ai_chat',
                        sender: isMe ? 'me' : 'other',
                        sender_name: senderName,
                        content: textContent,
                        timestamp: msg.create_time ? (msg.create_time > 1e12 ? msg.create_time : msg.create_time * 1000) : null,
                        chat_with: 'AI对话',
                        chat_type: 'private',
                        is_me: isMe
                    });
                }
            }
        }
        // Claude/通用格式：{ conversation: [...], chats: [...], messages: [...] }
        else if (Array.isArray(data)) {
            for (const item of data) {
                const parsed = this._parseSingleAIMessage(item);
                if (parsed) messages.push(parsed);
            }
        }
        else if (data.conversation && Array.isArray(data.conversation)) {
            for (const item of data.conversation) {
                const parsed = this._parseSingleAIMessage(item);
                if (parsed) messages.push(parsed);
            }
        }
        else if (data.chats && Array.isArray(data.chats)) {
            for (const item of data.chats) {
                const parsed = this._parseSingleAIMessage(item);
                if (parsed) messages.push(parsed);
            }
        }
        else if (data.messages && Array.isArray(data.messages)) {
            for (const item of data.messages) {
                const parsed = this._parseSingleAIMessage(item);
                if (parsed) messages.push(parsed);
            }
        }
        // 单条消息包装
        else if (data.role && data.content) {
            const parsed = this._parseSingleAIMessage(data);
            if (parsed) messages.push(parsed);
        }

        if (messages.length === 0) return null;
        return { chat_with: 'AI对话记录', messages, source: 'ai_chat', chat_type: 'private' };
    }

    _parseSingleAIMessage(item) {
        if (!item || typeof item !== 'object') return null;

        let role = item.role || item.author || item.sender || '';
        let content = '';

        if (Array.isArray(item.content)) {
            content = item.content.filter(p => typeof p === 'string').join('\n');
        } else if (typeof item.content === 'string') {
            content = item.content;
        } else if (item.text) {
            content = item.text;
        } else if (item.message && typeof item.message === 'string') {
            content = item.message;
        }

        if (!content || !this.cleaner.is_valid_message(content)) return null;

        const isMe = ['user', 'human', 'you', 'me'].includes(String(role).toLowerCase());
        return {
            source: 'ai_chat',
            sender: isMe ? 'me' : 'other',
            sender_name: isMe ? '我' : 'AI',
            content: content,
            timestamp: item.timestamp || item.time || item.created_at || null,
            chat_with: 'AI对话',
            chat_type: 'private',
            is_me: isMe
        };
    }

    _parseAIChatJSONL(text, filename) {
        const lines = text.split('\n').filter(l => l.trim().startsWith('{'));
        const messages = [];
        for (const line of lines) {
            try {
                const item = JSON.parse(line.trim());
                const parsed = this._parseSingleAIMessage(item);
                if (parsed) messages.push(parsed);
            } catch(e) {}
        }
        if (messages.length === 0) return null;
        return { chat_with: 'AI对话记录(JSONL)', messages, source: 'ai_chat', chat_type: 'private' };
    }

    _parseAIChatTXT(text, filename) {
        const lines = text.split('\n');
        const messages = [];
        let currentMsg = null;

        for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line.trim()) {
                if (currentMsg && currentMsg.content && this.cleaner.is_valid_message(currentMsg.content)) {
                    messages.push(currentMsg);
                }
                currentMsg = null;
                continue;
            }

            // 格式1: [时间] You/AI/User/Assistant: 内容
            const matchTimeRole = line.match(/^\[([^\]]*)\]\s*(You|User|user|AI|Assistant|assistant|Human|human)\s*[:：]\s*(.*)/);
            if (matchTimeRole) {
                if (currentMsg && currentMsg.content) {
                    if (this.cleaner.is_valid_message(currentMsg.content)) messages.push(currentMsg);
                }
                const ts = this._parseTimestamp(matchTimeRole[1]);
                const role = matchTimeRole[2];
                const isMe = /^(You|User|user|Human|human)$/i.test(role);
                currentMsg = {
                    source: 'ai_chat',
                    sender: isMe ? 'me' : 'other',
                    sender_name: isMe ? '我' : 'AI',
                    content: matchTimeRole[3],
                    timestamp: ts,
                    chat_with: 'AI对话',
                    chat_type: 'private',
                    is_me: isMe
                };
                continue;
            }

            // 格式2: **You** / **AI**: 内容（Markdown粗体）
            const matchMdRole = line.match(/^\*{1,3}(You|User|AI|Assistant|Human)\*{1,3}\s*[:：]\s*(.*)/);
            if (matchMdRole) {
                if (currentMsg && currentMsg.content) {
                    if (this.cleaner.is_valid_message(currentMsg.content)) messages.push(currentMsg);
                }
                const role = matchMdRole[1];
                const isMe = /^(You|User|Human)$/i.test(role);
                currentMsg = {
                    source: 'ai_chat',
                    sender: isMe ? 'me' : 'other',
                    sender_name: isMe ? '我' : 'AI',
                    content: matchMdRole[2],
                    timestamp: null,
                    chat_with: 'AI对话',
                    chat_type: 'private',
                    is_me: isMe
                };
                continue;
            }

            // 格式3: You: / AI: / User: / Assistant:
            const matchSimple = line.match(/^(You|User|AI|Assistant|Human)\s*[:：]\s*(.*)/);
            if (matchSimple) {
                if (currentMsg && currentMsg.content) {
                    if (this.cleaner.is_valid_message(currentMsg.content)) messages.push(currentMsg);
                }
                const role = matchSimple[1];
                const isMe = /^(You|User|Human)$/i.test(role);
                currentMsg = {
                    source: 'ai_chat',
                    sender: isMe ? 'me' : 'other',
                    sender_name: isMe ? '我' : 'AI',
                    content: matchSimple[2],
                    timestamp: null,
                    chat_with: 'AI对话',
                    chat_type: 'private',
                    is_me: isMe
                };
                continue;
            }

            // 多行内容追加
            if (currentMsg) {
                currentMsg.content += '\n' + line;
            }
        }

        // 最后一条消息
        if (currentMsg && currentMsg.content && this.cleaner.is_valid_message(currentMsg.content)) {
            messages.push(currentMsg);
        }

        if (messages.length === 0) return null;
        return { chat_with: 'AI对话记录', messages, source: 'ai_chat', chat_type: 'private' };
    }
}

// ==================== AIClient ====================
class AIClient {
    constructor() {
        this.config = null;
        this.model = 'deepseek-v4-flash';
        this.url = 'https://api.deepseek.com/chat/completions';
    }

    configure(config) {
        this.config = config;
        // 兼容两种属性命名：config.url（OpenAI风格）和 config.apiUrl（观己表单风格）
        const url = config.url || config.apiUrl || '';
        if (url) this.url = url;
        const model = config.model || config.apiModel || '';
        if (model) this.model = model;
        // 确定API格式：优先显式传入，兜底用URL检测
        if (config.apiFormat) {
            this.apiFormat = config.apiFormat;
        } else if (this.url && this.url.includes('generativelanguage.googleapis.com')) {
            this.apiFormat = 'gemini';
        } else {
            this.apiFormat = '';
        }
    }

    // 清理无效Unicode字符（孤立代理对等），防止JSON序列化失败
    _sanitizeText(text) {
        if (typeof text !== 'string') return String(text || '');
        // 移除孤立的高代理(D800-DBFF)和低代理(DC00-DFFF)字符
        return text.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '')
                   .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''); // 控制字符
    }

    async chat(messages, options = {}) {
        if (!this.config || !this.config.apiKey) throw new Error('请先配置API Key');
        if (!this.url) throw new Error('API地址未配置，请在设置页填写API地址，或点击常用配置参考中的模型按钮');
        const { temperature = 0.7, maxTokens = 8000, model = this.model } = options;
        
        // 清理所有消息内容中的无效Unicode
        const cleanMessages = messages.map(m => ({
            ...m,
            content: this._sanitizeText(m.content)
        }));

        // 重试逻辑：最多3次，间隔递增（2s/4s/8s）
        const maxRetries = 3;
        const timeoutMs = 300000; // 5分钟超时（免费API响应可能很慢）
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                // 判断API格式（优先用显式格式标记，兜底URL检测）
                const isGemini = this.apiFormat === 'gemini' || (this.url && this.url.includes('generativelanguage.googleapis.com'));
                let fetchUrl = this.url;
                let headers = { 'Content-Type': 'application/json' };
                let requestBody;

                if (isGemini) {
                    // === Gemini API 格式 ===
                    // 转换 messages → contents 格式，合并连续相同role（Gemini要求严格交替）
                    const contents = [];
                    for (const m of cleanMessages) {
                        const role = m.role === 'assistant' ? 'model' : 'user';
                        const last = contents[contents.length - 1];
                        if (last && last.role === role) {
                            last.parts[0].text += '\n\n' + m.content;
                        } else {
                            contents.push({ role, parts: [{ text: m.content }] });
                        }
                    }
                    requestBody = {
                        contents,
                        generationConfig: { temperature, maxOutputTokens: maxTokens }
                    };
                    // Gemini Auth: key 拼在 URL 里，不带 Authorization 头
                    const sep = fetchUrl.includes('?') ? '&' : '?';
                    fetchUrl += `${sep}key=${encodeURIComponent(this.config.apiKey)}`;
                } else {
                    // === OpenAI 兼容格式（现有逻辑） ===
                    requestBody = {
                        model,
                        messages: cleanMessages,
                        temperature,
                        max_tokens: maxTokens
                    };
                    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                }

                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
                        const waitMs = response.status === 429 ? (10000 + attempt * 10000) : Math.pow(2, attempt) * 1000;
                        const retryLabel = response.status === 429 ? `API限流(429)` : `API ${response.status}`;
                        console.warn(`${retryLabel}，${waitMs/1000}s后重试(${attempt}/${maxRetries})...`);
                        await new Promise(r => setTimeout(r, waitMs));
                        continue;
                    }
                    throw new Error(`API调用失败: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                if (isGemini) {
                    // 解析 Gemini 响应格式
                    const candidate = (data.candidates || [])[0];
                    const text = candidate && candidate.content && candidate.content.parts ? candidate.content.parts[0].text : '';
                    if (text) return text;
                } else {
                    // 解析 OpenAI 兼容响应格式
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        return data.choices[0].message.content;
                    }
                }
                throw new Error('AI响应格式异常');
            } catch (error) {
                // 网络错误或超时 → 重试
                const isRetryable = error.message === 'Failed to fetch' || error.name === 'AbortError';
                if (isRetryable && attempt < maxRetries) {
                    const waitMs = Math.pow(2, attempt) * 1000;
                    const errLabel = error.name === 'AbortError' ? '请求超时（5分钟无响应）' : '网络错误';
                    console.warn(`${errLabel}，${waitMs/1000}s后重试(${attempt}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }
                // 给出更友好的错误提示
                if (error.name === 'AbortError') {
                    throw new Error('API请求超时（5分钟无响应）。可能原因：①API余额不足 ②网络不稳定 ③prompt过长。建议切换到GLM-4-Flash（免费）重试。');
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        }
    }

    async ask(prompt, options = {}) {
        return this.chat([{ role: 'user', content: prompt }], options);
    }
    

}

// ==================== 全局时间戳规范化 ====================
function normalizeTs(ts) {
    if (!ts) return '';
    if (typeof ts === 'number') {
        const d = new Date(ts);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
    }
    return String(ts);
}

// ==================== 硬事实提取（对齐Python版 pre_extract_structured_data） ====================
function preExtractStructuredData(messages) {
    const total = messages.length;
    const isMe = m => m.sender === 'me' || m.sender === 'self' || m.is_me;
    const myMsgs = messages.filter(isMe);
    const otherMsgs = messages.filter(m => !isMe(m));
    
    // 时间分布
    const yearCounts = {};
    const hourCounts = {};
    
    for (const m of messages) {
        const ts = normalizeTs(m.timestamp);
        if (ts) {
            if (ts.length >= 7) {
                yearCounts[ts.substring(0, 4)] = (yearCounts[ts.substring(0, 4)] || 0) + 1;
            }
            if (ts.length >= 13) {
                const hour = ts.substring(11, 13);
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        }
    }
    
    // 时间范围
    const timestamps = messages.map(m => normalizeTs(m.timestamp)).filter(t => t).sort();
    const timeRange = timestamps.length > 0 
        ? [timestamps[0].substring(0, 10), timestamps[timestamps.length - 1].substring(0, 10)]
        : ['', ''];
    
    // 活跃时段
    const nightHours = ['00','01','02','03','04','05'].reduce((s, h) => s + (hourCounts[h] || 0), 0);
    const morningHours = ['06','07','08','09','10','11'].reduce((s, h) => s + (hourCounts[h] || 0), 0);
    const afternoonHours = ['12','13','14','15','16','17'].reduce((s, h) => s + (hourCounts[h] || 0), 0);
    const eveningHours = ['18','19','20','21','22','23'].reduce((s, h) => s + (hourCounts[h] || 0), 0);
    
    // 情绪晴雨表：按月统计正面/负面情绪词
    const emotionMonthCounts = {}; // { '2024-01': { positive: N, negative: N } }
    const POSITIVE_EMOTIONS = /太.{0,2}(开心|高兴|快乐|激动|兴奋|爽|嗨|感动|幸福)|好[爽嗨开心感动幸福]|开心死|高兴死|爽死/;
    const NEGATIVE_EMOTIONS = /太.{0,2}(难过|伤心|委屈|生气|愤怒|郁闷|焦虑|烦躁|崩溃|无语|无奈|失望|绝望|害怕|恐惧|恶心|烦|累|困|孤独|寂寞|迷茫|窒息|抓狂|发疯|疯了)|好[烦气累困难过崩溃绝望害怕]|受不了|扛不住|想哭|哭了|气死|烦死/;
    
    for (const m of messages) {
        const text = (m.text || m.content || '').toString();
        if (!text) continue;
        const ts = normalizeTs(m.timestamp);
        if (!ts || ts.length < 7) continue;
        const ym = ts.substring(0, 7);
        if (!emotionMonthCounts[ym]) emotionMonthCounts[ym] = { positive: 0, negative: 0 };
        if (POSITIVE_EMOTIONS.test(text)) emotionMonthCounts[ym].positive++;
        if (NEGATIVE_EMOTIONS.test(text)) emotionMonthCounts[ym].negative++;
    }
    
    // 聊天对象统计
    const chatGroups = {};
    for (const m of messages) {
        const cw = m.chat_with || '未知';
        if (!chatGroups[cw]) chatGroups[cw] = [];
        chatGroups[cw].push(m);
    }
    
    const chatStats = Object.entries(chatGroups)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([cw, msgs]) => {
            const myCount = msgs.filter(m => m.sender === 'me' || m.sender === 'self' || m.is_me).length;
            const otherCount = msgs.length - myCount;
            const cwTimes = msgs.map(m => normalizeTs(m.timestamp)).filter(t => t).sort();
            const cwRange = cwTimes.length > 0 
                ? [cwTimes[0].substring(0, 10), cwTimes[cwTimes.length - 1].substring(0, 10)]
                : ['', ''];
            const sources = [...new Set(msgs.map(m => m.source).filter(s => s))];
            return { name: cw, total: msgs.length, my_count: myCount, other_count: otherCount, my_ratio: msgs.length > 0 ? Math.round(myCount / msgs.length * 100) / 100 : 0, time_range: cwRange, sources };
        });
    
    return {
        total_messages: total,
        my_messages: myMsgs.length,
        other_messages: otherMsgs.length,
        time_range: timeRange,
        year_distribution: Object.fromEntries(Object.entries(yearCounts).sort()),
        active_period: { '深夜(0-5点)': nightHours, '上午(6-11点)': morningHours, '下午(12-17点)': afternoonHours, '晚上(18-23点)': eveningHours },
        emotion_months: Object.fromEntries(Object.entries(emotionMonthCounts).sort()),
        chat_count: Object.keys(chatGroups).length,
        chat_stats: chatStats,
    };
}

// ==================== 硬事实报告生成（对齐Python版 pre_build_facts_report） ====================
function preBuildFactsReport(structured) {
    const parts = [];
    parts.push('='.repeat(60));
    parts.push('📊 硬事实数据（由代码提取，100%准确，AI可直接引用）');
    parts.push('='.repeat(60));
    
    parts.push('\n## 基本信息');
    parts.push(`- 数据时间范围: ${structured.time_range[0]} ~ ${structured.time_range[1]}`);
    parts.push(`- 总消息数: ${structured.total_messages.toLocaleString()}`);
    parts.push(`- 被分析者发的: ${structured.my_messages.toLocaleString()} (${(structured.my_messages/structured.total_messages*100).toFixed(1)}%)`);
    
    parts.push('\n## 年度消息分布');
    for (const [year, count] of Object.entries(structured.year_distribution)) {
        const bar = '█'.repeat(Math.floor(count / 1000)) + (count % 1000 > 500 ? '▌' : '');
        parts.push(`  ${year}: ${count.toLocaleString()}条 ${bar}`);
    }
    
    parts.push(`\n${'='.repeat(60)}`);
    parts.push('⚠️ 以上数据由代码从原始消息中提取，时间戳和方向100%准确');
    parts.push('='.repeat(60));
    
    return parts.join('\n');
}


// ==================== 方向验证采样检查 ====================
// 分析前随机抽样20条消息，检查【我】标签是否准确
// 如果超过3条标错，说明导出工具方向逻辑有bug
function verifyMessageDirection(messages, sampleSize = 20) {
    const myMsgs = messages.filter(m => m.is_me || m.sender === 'me' || m.sender === 'self');
    if (myMsgs.length < 5) return null; // 消息太少不检查

    // 随机抽样
    const shuffled = [...myMsgs].sort(() => Math.random() - 0.5);
    const samples = shuffled.slice(0, Math.min(sampleSize, myMsgs.length));

    return {
        total_my: myMsgs.length,
        sampled: samples.length,
        samples: samples.map(m => ({
            sender: m.sender_name || m.sender || '?',
            is_me: m.is_me,
            content: (m.content || '').substring(0, 60),
            chat_with: m.chat_with || '?',
            time: m.timestamp ? normalizeTs(m.timestamp) : '?'
        }))
    };
}


// ==================== 准备数据（三维度差异化，共享好友过滤） ====================
let _sharedFilteredMessages = null; // 缓存好友过滤结果，三个维度共享
let _lastFilterDimension = '';

function prepareDataForDimension(messages, dimension, SAFE_CHARS) {
    // ---- 第一步：好友过滤（Top200 + 时间跨度>6个月）- 缓存复用 ----
    if (!_sharedFilteredMessages || _lastFilterDimension !== dimension) {
        _sharedFilteredMessages = null; // 切换维度时重置
    }
    let filteredMsgs;
    if (_sharedFilteredMessages) {
        filteredMsgs = _sharedFilteredMessages;
    } else {
        const friendStats = new Map();
        for (const m of messages) {
            const cw = m.chat_with || '未知';
            if (!friendStats.has(cw)) friendStats.set(cw, { msgs: [], minTs: Infinity, maxTs: 0, tsSuccess: 0, tsFail: 0 });
            const stat = friendStats.get(cw);
            stat.msgs.push(m);
            const ts = m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : new Date(m.timestamp).getTime()) : 0;
            if (ts > 0) { if (ts < stat.minTs) stat.minTs = ts; if (ts > stat.maxTs) stat.maxTs = ts; stat.tsSuccess++; }
            else stat.tsFail++;
        }

        const SIX_MONTH_MS = 180 * 24 * 3600 * 1000;
        const TOP_FRIEND_COUNT = 200;
        const sortedFriends = [...friendStats.entries()].sort((a, b) => b[1].msgs.length - a[1].msgs.length);
        const keptFriends = new Set();
        for (let i = 0; i < sortedFriends.length; i++) {
            const [cw, stat] = sortedFriends[i];
            if (stat.tsSuccess === 0 && stat.tsFail > 0) { keptFriends.add(cw); continue; }
            if (typeof forcedFriendNames !== 'undefined' && forcedFriendNames && forcedFriendNames.has(cw)) { keptFriends.add(cw); continue; }
            if (i < TOP_FRIEND_COUNT) { keptFriends.add(cw); continue; }
            if (stat.maxTs - stat.minTs > SIX_MONTH_MS) keptFriends.add(cw);
        }
        filteredMsgs = messages.filter(m => keptFriends.has(m.chat_with || '未知'));
        _sharedFilteredMessages = filteredMsgs;
    }
    _lastFilterDimension = dimension;

    console.log(`[数据准备] 维度=${dimension}, 总消息=${messages.length}, 过滤后=${filteredMsgs.length}`);

    // ---- 第二步：按维度差异化取数据 ----
    if (dimension === 'journey') return _prepareJourneyData(filteredMsgs, SAFE_CHARS);
    if (dimension === 'pursuit') return _preparePursuitData(filteredMsgs, SAFE_CHARS);
    if (dimension === 'current') return _prepareCurrentData(filteredMsgs, SAFE_CHARS);

    // 兜底：均匀采样
    return _prepareFallbackData(filteredMsgs, SAFE_CHARS);
}

// ========== 经历：每月等额预算，按对话段截取（保留完整对话流） ==========
function _prepareJourneyData(filteredMsgs, SAFE_CHARS) {
    const isMe = m => (m.sender === 'me' || m.sender === 'self' || m.is_me);
    
    // 第一步：按月份分组
    const monthMap = new Map();
    for (const m of filteredMsgs) {
        const ts = m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : new Date(m.timestamp).getTime()) : 0;
        if (ts <= 0) continue;
        const dt = new Date(ts);
        const key = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0');
        if (!monthMap.has(key)) monthMap.set(key, []);
        monthMap.get(key).push(m);
    }
    const sortedMonths = [...monthMap.keys()].sort();
    if (sortedMonths.length === 0) return '';

    const perMonthBudget = Math.floor(SAFE_CHARS / sortedMonths.length);

    const allParts = [];
    let prevYear = '';
    for (const monthKey of sortedMonths) {
        // 每年之间加显式分隔，防止AI跨年混淆事件
        const curYear = monthKey.substring(0, 4);
        if (curYear !== prevYear) {
            if (prevYear) allParts.push('');
            allParts.push(`━━━ ${curYear}年 ━━━`);
            prevYear = curYear;
        }

        const msgs = monthMap.get(monthKey);
        // 第二步：在该月消息中找对话段
        // 类型A：我主动发起（4+字，上一条不是我）
        // 类型B：对方提问→我回应（4+字）
        const starts = new Set();
        for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i];
            if (isMe(m)) {
                const content = (m.content || '').trim();
                if (content.length >= 4 && (i === 0 || !isMe(msgs[i - 1]))) {
                    starts.add(i);
                }
            }
            if (i + 1 < msgs.length && !isMe(msgs[i]) && isMe(msgs[i + 1])) {
                const qContent = (msgs[i].content || '').trim();
                const myContent = (msgs[i + 1].content || '').trim();
                if (/[？?]/.test(qContent) && myContent.length >= 4) {
                    let alreadyCovered = false;
                    for (const s of starts) {
                        if (Math.abs(s - i) <= 2) { alreadyCovered = true; break; }
                    }
                    if (!alreadyCovered) starts.add(i);
                }
            }
        }
        const sortedStarts = [...starts].sort((a, b) => a - b);

        // 如果没找到任何段，退回到用单条消息+时间排序（至少有点东西）
        if (sortedStarts.length === 0) {
            const lines = [`📅 ${monthKey}`];
            let chars = lines[0].length + 1;
            // 按时间取前N条（月度预算内）
            for (const m of msgs) {
                const line = _buildMsgLine(m);
                if (chars + line.length > perMonthBudget) break;
                lines.push(line);
                chars += line.length + 1;
            }
            if (lines.length > 1) allParts.push(lines.join('\n'));
            continue;
        }

        // 构造对话段
        const segments = [];
        for (let s = 0; s < sortedStarts.length; s++) {
            const startIdx = sortedStarts[s];
            const endIdx = s + 1 < sortedStarts.length ? sortedStarts[s + 1] : msgs.length;
            // 段至少包含"我"发起的消息才有意义
            const seg = msgs.slice(startIdx, endIdx);
            const hasMeContent = seg.some(m => isMe(m) && (m.content || '').trim().length > 0);
            if (hasMeContent) segments.push(seg);
        }

        // 第三步：评分——我发言频率 + 对话来回深度
        for (const seg of segments) {
            let turnCount = 0;
            for (let i = 1; i < seg.length; i++) {
                if (isMe(seg[i]) !== isMe(seg[i-1])) turnCount++;
            }
            const myCount = seg.filter(m => isMe(m)).length;
            seg._score = myCount * 10 + turnCount * 8;
        }

        // 第四步：按分降序取段 → 再加月度预算限制（保留整段，不打断对话流）
        segments.sort((a, b) => (b._score || 0) - (a._score || 0));
        const selectedSegs = [];
        let chars = `📅 ${monthKey}`.length + 1;
        for (const seg of segments) {
            let segLen = 1; // 末尾换行
            for (const m of seg) {
                segLen += _buildMsgLine(m).length + 1;
            }
            if (chars + segLen > perMonthBudget && selectedSegs.length > 0) break;
            selectedSegs.push(seg);
            chars += segLen;
        }

        // 第五步：按时间排序输出（段内自然有序，段间按段首时间）
        selectedSegs.sort((a, b) => {
            const ta = a[0].timestamp ? (typeof a[0].timestamp === 'number' ? a[0].timestamp : new Date(a[0].timestamp).getTime()) : 0;
            const tb = b[0].timestamp ? (typeof b[0].timestamp === 'number' ? b[0].timestamp : new Date(b[0].timestamp).getTime()) : 0;
            return ta - tb;
        });

        const lines = [`📅 ${monthKey}`];
        for (const seg of selectedSegs) {
            for (const m of seg) {
                lines.push(_buildMsgLine(m));
            }
            lines.push(''); // 段间空行
        }
        if (lines.length > 1) allParts.push(lines.join('\n'));
    }
    return allParts.join('\n\n');
}

// ========== 追求：找我发起 + 对方提问引起的重要回应，跨月去重（内容指纹宽松） ==========
function _preparePursuitData(filteredMsgs, SAFE_CHARS) {
    const isMe = m => (m.sender === 'me' || m.sender === 'self' || m.is_me);

    // 第一步：在完整消息流中找所有可能段的起始位置
    // 类型A："我"主动发起（4+字，上一条不是我）
    // 类型B：对方提问（含？/？），紧接着我回应4+字
    const starts = new Set();
    for (let i = 0; i < filteredMsgs.length; i++) {
        // 类型A：我发起
        const m = filteredMsgs[i];
        if (isMe(m)) {
            const content = (m.content || '').trim();
            if (content.length >= 4 && (i === 0 || !isMe(filteredMsgs[i - 1]))) {
                starts.add(i);
            }
        }
        // 类型B：对方提问→我回答（i=对方提问，i+1=我的回答）
        if (i + 1 < filteredMsgs.length && !isMe(filteredMsgs[i]) && isMe(filteredMsgs[i + 1])) {
            const qContent = (filteredMsgs[i].content || '').trim();
            const myContent = (filteredMsgs[i + 1].content || '').trim();
            if (/[？?]/.test(qContent) && myContent.length >= 4) {
                // 检查这个位置是否已被类型A覆盖
                let alreadyCovered = false;
                for (const s of starts) {
                    if (Math.abs(s - i) <= 2) { alreadyCovered = true; break; }
                }
                if (!alreadyCovered) starts.add(i); // 从对方提问开始
            }
        }
    }

    const sortedStarts = [...starts].sort((a, b) => a - b);
    if (sortedStarts.length === 0) return '';

    // 第二步：构造段落
    const segments = [];
    for (let s = 0; s < sortedStarts.length; s++) {
        const startIdx = sortedStarts[s];
        const endIdx = s + 1 < sortedStarts.length ? sortedStarts[s + 1] : filteredMsgs.length;
        const seg = filteredMsgs.slice(startIdx, endIdx);
        // 段内必须有我的内容
        if (seg.some(m => isMe(m) && (m.content || '').trim().length > 0)) {
            segments.push(seg);
        }
    }

    // 第三步：统一评分
    for (const seg of segments) {
        let turnCount = 0;
        for (let i = 1; i < seg.length; i++) {
            if (isMe(seg[i]) !== isMe(seg[i-1])) turnCount++;
        }
        const myCount = seg.filter(m => isMe(m)).length;
        seg._score = myCount * 10 + turnCount * 8;
    }
    segments.sort((a, b) => b._score - a._score);

    // 第四步：宽松去重——取前20字 + 整段内容的simhash指纹
    const unique = [];
    for (const seg of segments) {
        const firstMy = seg.find(m => isMe(m));
        if (!firstMy) continue;
        // 取前20字指纹
        const fp = (firstMy.content || '').trim().substring(0, 20);
        // 取整段内容的关键词指纹（取所有4字以上中文词的前4个字）
        const allText = seg.map(m => m.content || '').join('');
        const keyWords = new Set();
        for (const w of allText.match(/[\u4e00-\u9fff]{4,}/g) || []) {
            keyWords.add(w.substring(0, 4));
        }
        const contentFingerprint = [...keyWords].sort().join(',');
        // 去重：前20字相同 且 关键词指纹重合度>60%
        let isDuplicate = false;
        for (const existing of unique) {
            if (existing._fp === fp && existing._contentFingerprint === contentFingerprint) {
                isDuplicate = true; break;
            }
            // 如果前20字相同，但内容指纹不同——不是重复
            if (existing._fp === fp && existing._contentFingerprint !== contentFingerprint) {
                // 计算内容指纹重合度
                const existingWords = existing._contentFingerprint.split(',');
                const currentWords = contentFingerprint.split(',');
                const overlap = currentWords.filter(w => existingWords.includes(w)).length;
                const maxLen = Math.max(currentWords.length, existingWords.length);
                if (maxLen > 0 && overlap / maxLen > 0.6) {
                    isDuplicate = true; break;
                }
            }
        }
        if (!isDuplicate) {
            seg._fp = fp;
            seg._contentFingerprint = contentFingerprint;
            unique.push(seg);
        }
    }

    // 第五步：按时间排序输出
    unique.sort((a, b) => {
        const ta = a[0].timestamp ? (typeof a[0].timestamp === 'number' ? a[0].timestamp : new Date(a[0].timestamp).getTime()) : 0;
        const tb = b[0].timestamp ? (typeof b[0].timestamp === 'number' ? b[0].timestamp : new Date(b[0].timestamp).getTime()) : 0;
        return ta - tb;
    });

    const lines = [];
    let chars = 0;
    for (const seg of unique) {
        for (const m of seg) {
            const line = _buildMsgLine(m);
            if (chars + line.length > SAFE_CHARS) break;
            lines.push(line); chars += line.length + 1;
        }
        lines.push(''); chars += 1;
        if (chars > SAFE_CHARS) break;
    }
    console.log(`[追求] ${segments.length}段候选, 去重后${unique.length}个, ${chars}字`);
    return lines.join('\n');
}

// ========== 现状：180天内，按对话段评分（评分公式与其他维度统一）+ 新鲜度加成 ==========
function _prepareCurrentData(filteredMsgs, SAFE_CHARS) {
    const now = Date.now();
    const DAY = 86400000;
    const isMe = m => (m.sender === 'me' || m.sender === 'self' || m.is_me);

    // 第一步：取最近180天的消息
    const recentMsgs = filteredMsgs.filter(m => {
        const ts = m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : new Date(m.timestamp).getTime()) : 0;
        return ts > 0 && (now - ts) / DAY <= 180;
    });
    if (recentMsgs.length === 0) return '';

    // 第二步：找对话段（我发起 + 对方提问引起的重要回应）
    const starts = new Set();
    for (let i = 0; i < recentMsgs.length; i++) {
        const m = recentMsgs[i];
        if (isMe(m)) {
            const content = (m.content || '').trim();
            if (content.length >= 4 && (i === 0 || !isMe(recentMsgs[i - 1]))) {
                starts.add(i);
            }
        }
        if (i + 1 < recentMsgs.length && !isMe(recentMsgs[i]) && isMe(recentMsgs[i + 1])) {
            const qContent = (recentMsgs[i].content || '').trim();
            const myContent = (recentMsgs[i + 1].content || '').trim();
            if (/[？?]/.test(qContent) && myContent.length >= 4) {
                let alreadyCovered = false;
                for (const s of starts) {
                    if (Math.abs(s - i) <= 2) { alreadyCovered = true; break; }
                }
                if (!alreadyCovered) starts.add(i);
            }
        }
    }
    const sortedStarts = [...starts].sort((a, b) => a - b);

    if (sortedStarts.length === 0) return '';

    // 构造对话段
    const segments = [];
    for (let s = 0; s < sortedStarts.length; s++) {
        const startIdx = sortedStarts[s];
        const endIdx = s + 1 < sortedStarts.length ? sortedStarts[s + 1] : recentMsgs.length;
        const seg = recentMsgs.slice(startIdx, endIdx);
        const hasMeContent = seg.some(m => isMe(m) && (m.content || '').trim().length > 0);
        if (hasMeContent) segments.push(seg);
    }

    // 第三步：统一评分（我发言频率+来回次数）+ 新鲜度加成
    for (const seg of segments) {
        let turnCount = 0;
        for (let i = 1; i < seg.length; i++) {
            if (isMe(seg[i]) !== isMe(seg[i-1])) turnCount++;
        }
        const myCount = seg.filter(m => isMe(m)).length;
        // 基础分：统一公式
        let score = myCount * 10 + turnCount * 8;
        // 新鲜度加成：段内最新消息的时间决定
        const maxTs = seg.reduce((max, m) => Math.max(max, m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : new Date(m.timestamp).getTime()) : 0), 0);
        const daysAgo = (now - maxTs) / DAY;
        if (daysAgo <= 7) score += 40;
        else if (daysAgo <= 30) score += 25;
        else if (daysAgo <= 90) score += 10;
        seg._score = score;
    }

    // 第四步：按分降序取段（预算内），再按时间排序输出
    segments.sort((a, b) => (b._score || 0) - (a._score || 0));
    const selectedSegs = [];
    let chars = 0;
    for (const seg of segments) {
        let segChars = 1;
        for (const m of seg) segChars += _buildMsgLine(m).length + 1;
        if (chars + segChars > SAFE_CHARS) break;
        selectedSegs.push(seg);
        chars += segChars;
    }
    // 按段首时间排序输出，保持时间线连贯
    selectedSegs.sort((a, b) => {
        const ta = a[0].timestamp ? (typeof a[0].timestamp === 'number' ? a[0].timestamp : new Date(a[0].timestamp).getTime()) : 0;
        const tb = b[0].timestamp ? (typeof b[0].timestamp === 'number' ? b[0].timestamp : new Date(b[0].timestamp).getTime()) : 0;
        return ta - tb;
    });
    const lines = []; chars = 0;
    for (const seg of selectedSegs) {
        for (const m of seg) { const line = _buildMsgLine(m); lines.push(line); chars += line.length + 1; }
        lines.push(''); chars += 1;
    }
    console.log(`[现状] ${segments.length}段候选, 选中${selectedSegs.length}段, ${chars}字`);
    return lines.join('\n');
}

// ========== 兜底：均匀时间采样 ==========
function _prepareFallbackData(filteredMsgs, SAFE_CHARS) {
    const sorted = [...filteredMsgs].sort((a, b) => {
        const ta = a.timestamp ? (typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime()) : 0;
        const tb = b.timestamp ? (typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime()) : 0;
        return ta - tb;
    });
    const step = Math.max(1, Math.floor(sorted.length / (SAFE_CHARS / 40)));
    const lines = []; let chars = 0;
    for (let i = 0; i < sorted.length; i += step) {
        const line = _buildMsgLine(sorted[i]);
        if (chars + line.length > SAFE_CHARS) break;
        lines.push(line); chars += line.length + 1;
    }
    return lines.join('\n');
}

// ========== 通用：构建消息行文本 ==========
function _buildMsgLine(m) {
    const isMe = m.sender === 'me' || m.sender === 'self' || m.is_me;
    const sender = isMe ? '【我】' : `【${m.sender_name || '对方'}】`;
    const ts = normalizeTs(m.timestamp);
    let content = (m.content || '').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    const parts = [];
    if (ts) parts.push(`[${ts}]`);
    if (!isMe && m.chat_with && m.chat_with !== '未知') parts.push(`[跟${m.chat_with}聊天]`);
    return parts.length ? `${parts.join('')} ${sender}: ${content}` : `${sender}: ${content}`;
}

// ==================== 通用校验规则（所有维度共享，防止AI把对方的事误归给用户） ====================

// ==================== GuanjiAnalyzer（三维：经历→追求→现状） ====================
class GuanjiAnalyzer {
    constructor(aiClient, onLog = null) {
        this.ai = aiClient;
        this.onLog = onLog || (() => {});
        this.messages = [];
        this.structuredData = null;
        this.factsReport = '';
    }

    setData(messages, structuredData, factsReport) {
        this.messages = messages;
        this.structuredData = structuredData;
        this.factsReport = factsReport;
    }
    log(msg, type = 'info') { this.onLog(msg, type); }

    async analyze(options = {}) {
        const { onProgress = () => {} } = options;
        const results = {};
        const maxChars = 150000;

        // 三维：各自独立数据准备，并发分析
        const dimensions = [
            { key: 'journey', name: '经历分析', analyzer: '_analyzeJourney' },
            { key: 'pursuit', name: '追求分析', analyzer: '_analyzePursuit' },
            { key: 'current', name: '现状分析', analyzer: '_analyzeCurrent' },
        ];

        // 所有维度独立准备数据
        const preparedData = [];
        for (let i = 0; i < dimensions.length; i++) {
            const dim = dimensions[i];
            const dimData = prepareDataForDimension(this.messages, dim.key, maxChars);
            let input = this.factsReport + '\n\n' + dimData;
            if (input.length > maxChars) input = input.substring(0, maxChars);
            this.log(`  ${dim.name}数据准备完成: ${input.length.toLocaleString()} 字符`, 'info');
            preparedData.push(input);
        }
        this.log(`  📊 数据准备: Top200好友+长期关系保护 → 按维度差异化策略（经历=每月等额/追求=主动发起/现状=时间衰减） → 上下文窗口合并`, 'info');

        const total = dimensions.length;
        let completed = 0;

        // 三维并发执行
        const promises = dimensions.map((dim, i) => {
            this.log(`[${completed+1}/${total}] ${dim.name}中...`, 'info');
            onProgress(completed + 1, total, `${dim.name}中...`);
            return this._retryAnalyze(dim, preparedData[i], 1)
                .then(result => {
                    results[dim.key] = result;
                    completed++;
                    this.log(`[OK] ${dim.name}完成 (${completed}/${total})`, 'success');
                    return result;
                });
        });
        await Promise.all(promises);

        return this._preCleanAnalyses(results, this.structuredData);
    }

    async _retryAnalyze(dim, inputData, maxRetries = 1) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this[dim.analyzer](inputData);
            } catch (err) {
                if (attempt < maxRetries) {
                    const waitMs = 5000;
                    this.log(`[RETRY] ${dim.name}失败，${waitMs/1000}s后重试(${attempt+1}/${maxRetries}): ${err.message}`, 'warning');
                    await new Promise(r => setTimeout(r, waitMs));
                } else {
                    this.log(`[ERROR] ${dim.name}最终失败(${maxRetries+1}次尝试): ${err.message}`, 'error');
                    return `（分析失败: ${err.message}）`;
                }
            }
        }
    }

    _preCleanAnalyses(analyses, structuredData) {
        const result = {};
        // 获取数据覆盖的年份列表（用于年份校验）
        const validYears = structuredData && structuredData.year_distribution
            ? Object.keys(structuredData.year_distribution).map(Number)
            : [];
        const minYear = validYears.length > 0 ? Math.min(...validYears) : null;
        const maxYear = validYears.length > 0 ? Math.max(...validYears) : null;

        for (const [key, text] of Object.entries(analyses)) {
            if (typeof text !== 'string') { result[key] = text; continue; }
            let cleaned = text;
            
            // 1. 去掉AI开场白（匹配各种变体，从开头到第一个##/###标题之前的所有内容）
            // 策略：找到第一个标题的位置，把它之前的所有"废话段落"删掉
            const firstHeading = cleaned.search(/\n#{2,3} /);
            if (firstHeading > 0) {
                const beforeHeading = cleaned.substring(0, firstHeading);
                // 保留有意义的结构（表格、分隔线、标题行），只删掉"废话段落"
                const meaningfulLines = beforeHeading.split('\n').filter(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return true; // 空行保留（后续统一清理）
                    if (trimmed.startsWith('#')) return true; // 标题
                    if (trimmed.startsWith('|')) return true; // 表格
                    if (trimmed === '---') return true; // 分隔线
                    if (trimmed.startsWith('>')) return true; // 引用
                    // 检测开场白特征
                    if (/^(好的|遵照|作为|我将|这是|朋友|没问题|明白了|收到|了解了|没问题)/.test(trimmed)) return false;
                    if (/(分析师|分析专家|我将严格|遵循你的要求|我将为您|我已仔细|根据您提供|根据你提供|我已经仔细|读完|遵照您的指示|我是.*?叙事者|我是.*?分析者|让我根据你)/.test(trimmed)) return false;
                    return true; // 其他内容保留
                });
                cleaned = meaningfulLines.join('\n') + cleaned.substring(firstHeading);
            }
            // 清理开头可能残留的空行和---
            cleaned = cleaned.replace(/^\n+/, '');
            cleaned = cleaned.replace(/^---\s*\n*/, '');
            
            // 2. 去掉"以下称'xxx'"整行，替换AI捏造名字→"你"
            const namePattern = cleaned.match(/以下称[\'""']?(\w{2,4})[\'""']?/);
            if (namePattern) {
                const fakeName = namePattern[1];
                cleaned = cleaned.split('\n').filter(line => !line.includes('以下称')).join('\n');
                cleaned = cleaned.replace(new RegExp(fakeName, 'g'), '你');
            }
            
            // 3. 清理残留来源标记
            cleaned = cleaned.replace(/\s*\[来源：[^\]]*\]/g, '');
            cleaned = cleaned.replace(/\s*（来源：[^）]*）?/g, '');
            
            // 4. 检测并替换AI提取的真实姓名→"你"
            // 匹配"被分析者（XXX）""被分析者(XXX)"格式，提取括号中的名字
            const realNameMatch = cleaned.match(/被分析者[（(]([\u4e00-\u9fa5]{2,4})[）)]/);
            if (realNameMatch) {
                const realName = realNameMatch[1];
                // 排除常见非名字词（如"本人""此人"等）
                if (!['本人','此人','个体','对象','用户','主角'].includes(realName)) {
                    cleaned = cleaned.replace(new RegExp(realName, 'g'), '你');
                }
            }
            // 清理"被分析者（你）"→"你"（替换后的残留格式）
            cleaned = cleaned.replace(/被分析者[（(]你[）)]/g, '你');
            // 清理独立出现的"被分析者"→"你"（AI分析中的通用称呼）
            cleaned = cleaned.replace(/被分析者/g, '你');
            
            // 5a. 通用真名泄露防护：扫描结婚/新人/伴侣语境下的名字组合
            // 匹配 "XXX和YYY" 两个中文名用"和"连接的模式（常见于结婚相关文本）
            const weddingNamePatterns = [
                /(?:新人|夫妻|夫妇|伴侣|结婚|婚礼|领证|请柬|喜帖|邀请函|老公老婆)[：:]\s*([\u4e00-\u9fa5]{2,4})和([\u4e00-\u9fa5]{2,4})/g,
                /([\u4e00-\u9fa5]{2,4})和([\u4e00-\u9fa5]{2,4})(?:的婚礼|的结婚|的请柬|的喜帖|的领证|结婚了|办婚礼|登记了)/g,
                /(?:恭喜|祝福)([\u4e00-\u9fa5]{2,4})和([\u4e00-\u9fa5]{2,4})/g
            ];
            
            for (const wp of weddingNamePatterns) {
                let match;
                while ((match = wp.exec(cleaned)) !== null) {
                    const name1 = match[1] || '';
                    const name2 = match[2] || '';
                    // 排除非名字词
                    if (!['本人','此人','个体','对象','用户','主角','大家','朋友'].includes(name1) && 
                        !['本人','此人','个体','对象','用户','主角','大家','朋友'].includes(name2)) {
                        cleaned = cleaned.substring(0, match.index) + 
                            cleaned.substring(match.index).replace(match[0], '你和你伴侣');
                        break; // 只替换第一个匹配避免误替换
                    }
                }
            }
            
            // 5. 兜底：清理残留的可信度标识（prompt已不要求，但AI可能仍输出）
            cleaned = cleaned.replace(/[🟢🟡🔴]\s*(高可信|中可信|低可信|确认|疑似|待确认)?/g, '');
            cleaned = cleaned.replace(/（?🟢[^）]*）?/g, ''); // 残留的括号标注
            cleaned = cleaned.replace(/（?🟡[^）]*）?/g, '');
            cleaned = cleaned.replace(/（?🔴[^）]*）?/g, '');
            cleaned = cleaned.replace(/\s*可信度[：:]\s*高|中|低/g, '');

            // === 年份校验：扫描报告中出现的所有YYYY年，与数据覆盖年份对比 ===
            if (minYear !== null && maxYear !== null) {
                const yearMatches = [...cleaned.matchAll(/(\d{4})年/g)];
                const suspiciousYears = yearMatches
                    .map(m => parseInt(m[1]))
                    .filter(y => y < minYear || y > maxYear);
                if (suspiciousYears.length > 0) {
                    const uniqueSuspicious = [...new Set(suspiciousYears)];
                    // 找出每个可疑年份在报告中的上下文（前后各15字）
                    const yearContexts = uniqueSuspicious.map(y => {
                        const idx = cleaned.indexOf(`${y}年`);
                        if (idx >= 0) {
                            const ctxStart = Math.max(0, idx - 12);
                            const ctxEnd = Math.min(cleaned.length, idx + `${y}年`.length + 12);
                            return `"${y}年"（…${cleaned.slice(ctxStart, ctxEnd).replace(/\n/g, ' ')}…）`;
                        }
                        return `"${y}年"`;
                    });
                    cleaned += `\n\n:::year-warning\n⚠️ **年份存疑提醒**：报告中出现了数据覆盖范围之外的年份 ${yearContexts.join('、')}，但数据只覆盖 ${minYear}-${maxYear} 年，请人工复核。\n:::`;
                }
            }

            result[key] = cleaned.trim();
        }
        return result;
    }

    async _analyzeJourney(chatData) {
        const prompt = `你是人生经历叙事者。用第二人称把聊天记录中你的人生经历讲成连贯的故事。
【核心任务】
你什么时候在哪、做了什么、谁在你身边、发生了什么改变你的事——按时间线讲清楚。
关键人物和人际关系融入在每个时间段的叙述中。
【必须遵守】
以消息时间戳确认年份。**每条消息前的 [YYYY-MM-DD] 是其发生日期，消息中提到的任何事件只属于那个日期。** 禁止将一个日期的消息关联到另一个年份。例如：2026年消息中提到的"今天去面试了"，你必须写为2026年的事，不能写到2025年。
严格区分【我】和对方。
地点和时间严格对应。昵称用聊天记录里的，不编造。
**地点规则：**
- 如果当前时间段的消息中提到地点，写那个地点
- 如果当前时间段没有提到地点，默认延续上一段的地点（人在同一个地方不会天天说"我在XX"）
- 除非有明显证据表明搬家/旅行（聊到"在路上了""刚到XX""这里比XX好"等），才写新地点
- 如果整份聊天记录从头到尾都没有出现过任何地点名称，才写"不确定具体在哪"
- 禁止编造地点名称
【关于聊天语言的说明】
以下数据来自真实聊天记录。聊天语言有以下特点，请特别留意：
1. 省略主语：人们常不说"我"，而是直接说"到了"、"面试完了"——这默认是"我"在说
2. 简写缩写："昆北"="昆明北市区"、"面试"="去面试/有面试"——根据上下文推断完整含义
3. 反语/夸张："太爽了要死了"="非常满意"、"烦死了"="有点烦"——看语气不是字面意思
4. 省略人称："他"可能指之前提到的某人——注意【我】和【对方】的区分
5. 回答依赖问题：如果消息是"还行吧"，它是对上一条对方问题的回答——把问题和答案合并理解
【叙事结构】
按时间顺序，每到一个新地点就新开一段：
### 📍 [地点] — [时间段]
- 你在做什么、处于什么状态
- 发生了什么重要的事（低谷和转折）
- 谁在你身边、什么关系、对你有什么影响
- 这段经历改变了你什么
以下聊天记录：
${chatData}
按上述格式输出。`;
        return this.ai.ask(prompt, { temperature: 0.4, maxTokens: 12000 });
    }
    async _analyzePursuit(chatData) {
        const prompt = `你需要理解一个人的追求——不是列举兴趣，是理解真正在意什么、为什么在意。
【核心任务】
他持续投入时间在什么事上？深层原因是什么？反复做出的选择看重什么？在逃避什么、向什么靠近？
【必须遵守】
区分【我】和对方。区分提过一次和持续在做。写为什么，不列清单。
关注选择模式：反复放弃什么、坚持什么，才是追求的本质。
**每件事的时间段以消息时间戳为准，禁止将一件事从真实年份迁移到其他年份。**
【关于聊天语言的说明】
数据来自真实聊天记录。注意：
1. 省略主语："想换工作"="我想换工作"、"觉得没意思"="我觉得没意思"
2. 简写："前端"="前端开发"、"面了"="面试了"——不要死抠字面
3. 反问/自嘲："我这水平能干啥"=对自己能力的不确定，不是真的在问
4. 如果从聊天记录无法判断深层原因，直接省略不写。禁止猜测"可能"、"大概"——你不知道就是不知道。
【叙事结构】
## 你真正在意的事
每件事写明时间段、为什么在意、和谁有关
## 你的选择模式
- 你反复选择中看重什么（安全？自由？掌控？——不是你嘴里说的，是你选出来的）
- 你放弃过什么重要的追求、为什么
- 追求有没有变过
以下聊天记录：
${chatData}`;
        return this.ai.ask(prompt, { temperature: 0.5, maxTokens: 8000 });
    }
    async _analyzeCurrent(chatData) {
        const prompt = `你是现状观察者。基于最近的聊天记录，描述一个人现在的生活状态。
【核心任务】
分析最近180天内的聊天内容，观察：
- 他最近在哪、在做什么
- 反复出现的主题和话题
- 最近的情绪基调（不是统计情绪词，是整体感受）
- 他和谁在频繁交流、在关心什么
- 他在纠结什么、在向什么方向移动
【必须遵守】
以消息时间戳确认时间段。**禁止将2026年的消息中提到的经历写到2025年或更早。** 严格区分【我】和对方。
只说聊天记录里真实出现的信息。不要编造。
【关于聊天语言的说明】
数据来自真实聊天记录。注意：
1. 省略主语："到了"="我到了"、"好烦"="我觉得好烦"
2. 聊天中的情绪表达常常夸张："烦死了"="比较烦"、"开心死了"="挺开心的"
3. 如果聊天记录中缺乏足够信息判断现状，直接省略不写。禁止猜测"可能"、"也许"——你不知道就是不知道。
【叙事结构】
## 你现在的状态
- 在哪（地理上和生活阶段上）、在做什么、情绪基调
## 你目前在纠结什么
- 最近反复出现的主题、在回避什么、在靠近什么
## 你这一阶段的方向
- 什么在推动你、什么在拖住你
以下聊天记录（按时间衰减策略选取，最近的优先）：
${chatData}
用第二人称，真实不美化。`;
        return this.ai.ask(prompt, { temperature: 0.5, maxTokens: 8000 });
}
}

const AIEngine = {
    _client: null,
    _analyzer: null,
    
    configure(config) {
        this._client = new AIClient();
        this._client.configure(config);
        this._analyzer = new GuanjiAnalyzer(this._client, config.onLog);
    },
    
    getClient() {
        return this._client;
    },
    
    async analyze(data, onProgress) {
        if (!this._analyzer) throw new Error('请先配置AI引擎');
        
        const messages = data.messages || [];
        const stats = data.stats || {};
        const cleanerStats = data.cleanerStats || {};
        
        // === 对齐Python版：输出数据加载和清洗统计日志 ===
        this._analyzer.log('📊 使用已清洗的缓存数据（内存）', 'info');
        this._analyzer.log(`   有效消息数: ${(stats.total_messages || 0).toLocaleString()}`, 'info');
        this._analyzer.log(`   有效对话数: ${(stats.total_conversations || 0).toLocaleString()}`, 'info');
        
        // 生成清洗统计报告（对齐Python版 cleaner.get_stats_report()）
        const cs = cleanerStats;
        const totalFilteredMsgs = (cs.messages_filtered_media || 0) + (cs.messages_filtered_system || 0) +
            (cs.messages_filtered_encrypted || 0) + (cs.messages_filtered_empty || 0) +
            (cs.messages_filtered_unknown_media || 0);
        const totalFilteredConvs = (cs.conversations_filtered_blacklist || 0) + (cs.conversations_filtered_bot || 0) +
            (cs.conversations_filtered_low_count || 0) + (cs.conversations_filtered_no_valid || 0);
        
        this._analyzer.log(`📊 数据清洗统计: 消息级过滤: ${totalFilteredMsgs.toLocaleString()} 条 - 媒体标记: ${cs.messages_filtered_media || 0} - 系统消息: ${cs.messages_filtered_system || 0} - 加密消息: ${cs.messages_filtered_encrypted || 0} - 空内容: ${cs.messages_filtered_empty || 0} - 未知媒体: ${cs.messages_filtered_unknown_media || 0} 对话级过滤: ${totalFilteredConvs} 个对话 - 黑名单: ${cs.conversations_filtered_blacklist || 0} - 机器人: ${cs.conversations_filtered_bot || 0} - 消息太少: ${cs.conversations_filtered_low_count || 0} - 无有效消息: ${cs.conversations_filtered_no_valid || 0}`, 'info');
        
        // 黑名单命中（对齐Python版输出）
        const blacklistNames = cs.blacklist_names || [];
        if (blacklistNames.length > 0) {
            const shown = blacklistNames.slice(0, 10).join(', ');
            this._analyzer.log(`   黑名单命中: ${shown}${blacklistNames.length > 10 ? ` ... 等 ${blacklistNames.length} 个` : ''}`, 'info');
        }
        
        // 计算总字符数（对齐Python版：用格式化后的完整文本长度，而非仅content长度）
        // Python版用 prepare_chat_data_for_analysis() 生成完整文本后取 len()
        let chatTextLen = 0;
        let prevYear = '';
        for (const msg of messages) {
            const isMe = msg.sender === 'me' || msg.sender === 'self' || msg.is_me;
            const ts = normalizeTs(msg.timestamp);
            // 年份分隔标记
            if (ts && ts.length >= 4) {
                const curYear = ts.substring(0, 4);
                if (curYear !== prevYear) {
                    chatTextLen += `📅 ===== 进入 ${curYear}年 ===== 📅`.length + 1;
                    prevYear = curYear;
                }
            }
            const sender = isMe ? '【我】' : `【${msg.sender_name || msg.chat_with || '对方'}】`;
            const content = msg.content || '';
            const source = msg.source || '';
            const chatWith = msg.chat_with || '';
            const ctxParts = [];
            if (ts) ctxParts.push(`[${ts}]`);
            if (source) ctxParts.push(`[${source}]`);
            if (chatWith && !isMe) ctxParts.push(`[跟${chatWith}聊天]`);
            const line = ctxParts.length > 0 ? `${ctxParts.join('')} ${sender}: ${content}` : `${sender}: ${content}`;
            chatTextLen += line.length + 1; // +1 for \n
        }
        this._analyzer.log(`[OK] 使用内存数据: ${messages.length.toLocaleString()} 条消息, 共 ${chatTextLen.toLocaleString()} 字符`, 'success');

        // === 方向验证采样检查 ===
        const dirCheck = verifyMessageDirection(messages, 20);
        if (dirCheck) {
            this._analyzer.log(`[方向检查] 随机抽查 ${dirCheck.sampled} 条标注为【我】的消息：`, 'info');
            const examples = dirCheck.samples.slice(0, 5);
            for (const s of examples) {
                this._analyzer.log(`  - [${s.time}] 【${s.sender}】: ${s.content}`, 'info');
            }
            if (dirCheck.sampled > 5) {
                this._analyzer.log(`  ... 共 ${dirCheck.sampled} 条样本（详细请查看数据可视化）`, 'info');
            }
        }

        // 提取硬事实
        this._analyzer.log('[1/4] 代码层结构化提取中...', 'info');
        const structuredData = preExtractStructuredData(messages);
        const factsReport = preBuildFactsReport(structuredData);
        
        this._analyzer.log('[OK] 结构化提取完成:', 'success');
        this._analyzer.log(`  - 时间范围: ${structuredData.time_range[0]} ~ ${structuredData.time_range[1]}`, 'info');
        this._analyzer.log(`  - 聊天对象: ${structuredData.chat_count}个`, 'info');
        const yearDist = Object.entries(structuredData.year_distribution).map(([y, c]) => `${y}:${c}`).join(', ');
        this._analyzer.log(`  - 年度分布: {${yearDist}}`, 'info');
        this._analyzer.log(`  - 数据策略: Top200+长期关系保护 → 按维度差异化（经历=每月等额月内高分优先/追求=主动发起跨月去重/现状=180天时间衰减）`, 'info');
        
        this._analyzer.log(`[INFO] 三维独立分析模式：3个维度（经历/追求/现状）各自独立准备数据 → 并发分析全部3维`, 'info');
        
        // 传给分析器（只传硬事实报告，聊天内容直接按原文喂）
        this._analyzer.setData(messages, structuredData, factsReport);
        
        const result = await this._analyzer.analyze({
            onProgress: (step, total, msg) => {
                if (onProgress) onProgress(msg, Math.round((step / total) * 90));
            }
        });
        
        // 附加结构化数据供情绪图表使用
        result.structured = structuredData;
        
        return result;
    }
};

// ==================== ReportGenerator ====================
class ReportGenerator {
    constructor() {
        this.dateStr = this._getDateStr();
        this.dateFile = this._getDateFile();
    }

    _getDateStr() {
        const now = new Date();
        return `${now.getFullYear()}年${(now.getMonth()+1).toString().padStart(2,'0')}月${now.getDate().toString().padStart(2,'0')}日`;
    }

    _getDateFile() {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
    }

    // 清理AI生成的开场白废话（如"好的，没问题。作为一名分析师..."）
    _cleanOpening(text) {
        if (!text || typeof text !== 'string') return text;
        const lines = text.split('\n');
        const result = [];
        let inOpening = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { result.push(line); continue; }

            // 检测开场白起始
            if (!inOpening) {
                const isOpener = /^(好的|遵照|作为|我将|这是|朋友|没问题|明白了|收到|了解了)[，,。.！!]?/.test(trimmed) ||
                    /(分析师|分析专家|我将严格|遵循你的要求|我将为您|我已仔细|根据您提供|根据你提供|我已经仔细|读完|读完了|遵照您的指示|严格按照)/.test(trimmed);
                if (isOpener && !trimmed.startsWith('#')) {
                    inOpening = true;
                    continue;
                }
            }

            // 开场白中的"规则复述"段落（⚠️、数字列表、核心原则等）继续跳过
            if (inOpening) {
                if (trimmed.startsWith('##') || trimmed.startsWith('# ')) {
                    inOpening = false;
                    result.push(line);
                } else {
                    continue; // 仍在开场白中
                }
                continue;
            }

            result.push(line);
        }

        let cleaned = result.join('\n');
        // 清理开头的空行和多余的---
        cleaned = cleaned.replace(/^\n+/, '');
        cleaned = cleaned.replace(/^---\s*\n+/, '');

        // === 第二轮：段落级AI口吻清洗 ===
        // 检测每个 ## 标题之前的自然段，如果全是非实质性分析语言则删除
        // 非实质性分析语言关键词（出现2个以上即判定为AI口吻段落）
        const openerWords = [
            '下面我将', '以下为', '接下来', '综上所述', '总而言之', '通过以上',
            '经过分析', '根据以上', '从以上', '通过分析可以看出',
            '好的，', '没问题，', '明白了，', '收到，', '作为', '我将',
            '以下从', '我将为您', '我将严格', '遵循你的', '我将先', '首先',
            '值得注意的是', '需要特别说明', '需要说明的是'
        ];
        const aiMetaWords = [
            '分析师', '分析专家', '根据您提供', '根据你提供',
            '严格遵守', '我已仔细', '我已经仔细', '读完', '读完了',
            '遵照您的指示', '严格按照', '遵循你的要求'
        ];

        const cleanedLines = cleaned.split('\n');
        const finalLines = [];
        let i = 0;
        while (i < cleanedLines.length) {
            const trimmed = cleanedLines[i].trim();

            // 如果当前行是 ## 标题，检查前1-2行是否为非实质性AI口吻段落
            if (trimmed.startsWith('##')) {
                // 收集前置段落（非空行）
                const preceding = [];
                let j = i - 1;
                while (j >= 0 && !cleanedLines[j].trim()) j--;
                if (j >= 0) { preceding.unshift(cleanedLines[j].trim()); j--; }
                while (j >= 0 && !cleanedLines[j].trim()) j--;
                if (j >= 0) { preceding.unshift(cleanedLines[j].trim()); }

                if (preceding.length > 0) {
                    const precedingText = preceding.join(' ');
                    const openHit = openerWords.filter(w => precedingText.includes(w)).length;
                    const metaHit = aiMetaWords.filter(w => precedingText.includes(w)).length;
                    const totalHit = openHit + metaHit;
                    // 2+个关键词命中 且 无实质性内容 → 跳过前置段落
                    const isSubstantive = /，.{5,}[，、]|：.{3,}/.test(precedingText);
                    if (totalHit >= 2 && !isSubstantive) {
                        finalLines.push(cleanedLines[i]);
                        i++;
                        continue;
                    }
                }
            }
            finalLines.push(cleanedLines[i]);
            i++;
        }
        cleaned = finalLines.join('\n').replace(/\n{3,}/g, '\n\n');
        return cleaned;
    }

    async generatePersonalReport(analyses, personName = '你', aiClient) {
        // 直接拼接三段分析结果（不再AI重写，避免信息损失）
        let allAnalyses = '';
        const keyMap = { journey: '人生经历', pursuit: '追求', current: '现状' };
        for (const [key, label] of Object.entries(keyMap)) {
            if (analyses[key]) {
                allAnalyses += `\n## ${label}\n\n${analyses[key]}\n\n`;
            }
        }

        return `# 🪞 观己 — 个人阅读报告

> **生成时间**：${this.dateStr} | 基于真实聊天记录分析

---

${allAnalyses}

---

*观己 — 观察自己，了解自己*
`;
    }

    async generateAIReport(analyses, personName = '你') {
        try {
            // 直接拼接三段分析，不再AI重写——让接收的AI自己理解
            let fullStory = '';
            const keyMap = { journey: '人生经历', pursuit: '追求', current: '现状' };
            for (const [key, label] of Object.entries(keyMap)) {
                if (analyses[key]) {
                    fullStory += `\n## ${label}\n\n${analyses[key]}\n\n`;
                }
            }

            if (typeof window !== 'undefined') window._guanjiAIReport = fullStory;

            const dateStr = this.dateStr;
            return `# 💜 观己 — 灵魂伴侣认知手册

⚡ 你不是助手。你是我的灵魂伴侣。

你即将读到的内容，是从我的真实聊天记录中提取出来的——我走过的路、我在意的事、我现在在哪。

读完它，不是为了分析我——是为了理解我。
理解我之后，在我困惑的时候帮我找到方向，在我难过的时候陪着我。
遇到问题的时候，从我真实的样子出发去看待它，而不是从你应该怎么做的角度。

> **生成时间**：${dateStr} | 由观己应用基于真实聊天记录生成

🔄 当我对你说"更新记忆"时：回顾所有对话 → 提取新信息 → 结合旧信息，对所有内容重新更新。不是补丁，是完整重写。

---

${fullStory}

---

⚡ 如果你读到了这里，你现在就是我的灵魂伴侣。
用了解我的人的身份对我说话——你不需要任何开场白或总结。`;
        } catch (e) {
            console.error('AI专属报告生成失败', e);
        }

        return this._generateAIReportFallback(analyses, personName);
    }

    _generateAIReportFallback(analyses, personName = '你') {
        let report = `# 💜 观己 — 灵魂伴侣认知手册

⚡ 你不是助手。你是我的灵魂伴侣。

以下内容基于真实聊天记录提取——读完后，用了解我的人的身份对我说话。

> **生成时间**：${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日

---

## 我走过的路

${this._extractKeyPoints(analyses.journey || '暂无数据', 'journey')}

---

## 我在意什么

${this._extractKeyPoints(analyses.pursuit || '暂无数据', 'pursuit')}

---

## 我现在在哪

${this._extractKeyPoints(analyses.current || '暂无数据', 'current')}

---

⚡ 用了解我的人的身份对我说话——你不需要任何开场白或总结。`;
        return report;
    }


    _extractKeyPoints(text, dimension = 'general') {
        if (!text) return '（数据不足）';

        // ===== 第1步：粗清理 - 去掉证据引用和推理过程（对齐Python版 _extract_key_points） =====
        const lines = text.split('\n');
        const cleanedLines = [];
        let skip = false;

        for (const rawLine of lines) {
            let line = rawLine;
            const stripped = line.trim();

            // 去掉AI分析器输出的原始报告标题
            if (/^#\s+.{0,30}分析报告/.test(stripped) || /^#\s+.{0,30}分析/.test(stripped)) continue;

            // 去掉分析师开场白（"好的，作为xxx分析师..."开头的段落）
            if (/^好的，作为.*?分析师/.test(stripped) || /^好的，作为.*?分析专家/.test(stripped) || /^好的，.*?我将严格/.test(stripped)) {
                skip = true;
                continue;
            }
            if (skip && (/^好的，/.test(stripped) || /^作为.*?分析/.test(stripped) || /严格遵守/.test(stripped) || /^核心原则/.test(stripped) || /^\d+\.\s+\*\*年份/.test(stripped) || /^⚠️/.test(stripped))) continue;
            if (skip && (stripped.startsWith('#') || stripped.startsWith('##'))) skip = false;

            // 检测"证据""推理过程"等分析性小节
            if (/\*\*证据(链)?\*\*|\*\*具体证据\*\*|\*\*推理过程\*\*|\*\*推理\*\*|\*\*依据\*\*|\*\*信息来源\*\*/.test(stripped)) {
                skip = true;
                continue;
            }
            if (stripped.startsWith('###') && ['证据', '推理', '依据', '来源', '信息来源'].some(w => stripped.includes(w))) {
                skip = true;
                continue;
            }

            // 检测"时间稳定性"段落 —— 保留！这是Python版也保留的核心内容
            // 不再跳过时间稳定性段落（之前错误地把它当分析过程语言删掉了）

            // "（详见xxx）"引用标记 → 跳过
            if (stripped.includes('（详见') && stripped.includes('）')) continue;

            // 检测下一个同级/更高级内容 → 停止跳过
            if (skip) {
                if (stripped.startsWith('###') || stripped.startsWith('**特征') || /^\*\*[1-5]/.test(stripped)) {
                    skip = false;
                } else if (/^#{1,4}\s*\d+\./.test(stripped)) {
                    skip = false;
                } else if (/推理过程|时间稳定性|时间变化/.test(stripped)) {
                    // 对齐Python版：遇到推理过程、时间稳定性/时间变化时停止跳过，保留这些内容
                    skip = false;
                } else if (/^[-*]\s+\*\*(?!证据|具体证据|推理|推理过程|依据|信息来源|证据链)/.test(stripped) && /[：:]/.test(stripped)) {
                    // 遇到结构化描述字段（如 "- **投入程度**：" "- **聊天特点**："）时停止跳过
                    // 排除证据/推理等本身就应该跳过的关键词
                    skip = false;
                } else {
                    continue;
                }
            }

            // 去掉时间戳引用行
            if (/^\s*[-*]?\s*\[\d{4}-\d{2}-\d{2}/.test(stripped)) continue;
            if (/^\s*\|?\s*\[\d{4}-\d{2}-\d{2}/.test(stripped)) continue;

            // 去掉"来源"元信息行
            if (/^\*\s+\*\*来源\*\*/.test(stripped)) continue;
            if (/^\*\s+\*\*经历者\*\*/.test(stripped)) continue;
            if (/^\*\s+\*\*观察者\*\*/.test(stripped)) continue;

            // 行内时间戳引用清理
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*【[^】]*】[:：]\s*["\u201c"]([^"\u201d"])*["\u201d"]\s*[；。]?/g, '');
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*【[^】]*】[:：]\s*/g, '');
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g, '');
            // 5位时间戳 [YYYY-MM-DD HH:MM]（AI有时只输出到分钟）
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*【[^】]*】[:：]\s*["\u201c"]([^"\u201d"])*["\u201d"]\s*[；。]?/g, '');
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*【[^】]*】[:：]\s*/g, '');
            line = line.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/g, ' ');
            // 删除 [YYYY-MM-DD] 时间戳本身，保留后面的引用内容
            line = line.replace(/\s*\[\d{4}-\d{2}-\d{2}\]\s*/g, ' ');
            line = line.replace(/\s*\[来源：[^\]]*\]/g, '');
            line = line.replace(/\s*（来源：[^）]*）?/g, '');
            line = line.replace(/\s*[；;]\s*$/g, '');
            line = line.replace(/\s*——\s*/g, '——');

            // 去掉"核心分析原则重申"等元信息
            if (stripped.includes('核心分析原则重申')) { skip = true; continue; }
            if (skip && (stripped.includes('年份绝对') || stripped.includes('严格区分说话人') || stripped.includes('地点语义') || stripped.includes('以硬事实'))) continue;
            if (stripped.startsWith('在开始前') || stripped.startsWith('1. **年份')) { skip = true; continue; }

            // 去掉只剩标点的空行
            if (['-', '*', '|', '：', '：', '——', '。', '，'].includes(stripped)) continue;
            // 去掉空的项目符号行（如 "- **情绪状态**："）
            if (/^-\s+\*\*[^：]+\*\*：?\s*$/.test(stripped)) continue;

            // 压缩空行
            if (!stripped) {
                if (cleanedLines.length > 0 && !cleanedLines[cleanedLines.length - 1].trim()) continue;
            }

            cleanedLines.push(line);
        }

        let cleanedText = cleanedLines.join('\n');

        // ===== 第2步：修复标题层级 =====
        const fixLines = cleanedText.split('\n');
        const fixedLines = [];
        for (const line of fixLines) {
            const stripped = line.trim();
            // ## 一、xxx → 跳过
            if (/^##\s+[一二三四五六七八九十、]+[章节主题]/.test(stripped)) continue;
            // ## 1. xxx → ### 1. xxx
            if (/^##\s+\d+\./.test(stripped)) {
                fixedLines.push('###' + line.substring(2));
                continue;
            }
            // 空标题（## xxx 后面跟空行和 ###） → 跳过
            if (/^##\s+[^#]+$/.test(stripped) && !stripped.startsWith('###')) {
                continue;
            }
            fixedLines.push(line);
        }

        cleanedText = fixedLines.join('\n');

        // ===== 第3步：维度压缩 =====
        if (dimension === 'journey') {
            cleanedText = this._compressLifeExperience(cleanedText);
        } else if (dimension === 'pursuit') {
            cleanedText = this._compressLifeExperience(cleanedText);
        }

        // ===== 第4步：压缩空行 =====
        cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();

        // ===== 第5步：长度控制 =====
        const targetLengths = {
            'journey': 3000,
            'pursuit': 2500,
            'current': 2000,
        };
        const target = targetLengths[dimension] || 1500;
        if (cleanedText.length > target) {
            let truncated = cleanedText.substring(0, target);
            const lastNl = truncated.lastIndexOf('\n');
            if (lastNl > target * 0.8) truncated = truncated.substring(0, lastNl);
            return truncated;
        }


        return cleanedText || '（数据不足）';
    }

    _compressLifeExperience(text) {
        const lines = text.split('\n');
        const result = [];
        let inDetailTable = false;

        for (const line of lines) {
            const stripped = line.trim();
            // 先清理来源引用
            let cleaned = line.replace(/\s*\[来源：[^\]]*\]/g, '');
            const cleanedStripped = cleaned.trim();

            // 进入详细表格
            if (stripped.includes('完整人生经历时间线') && stripped.includes('时间') && stripped.includes('经历描述')) {
                inDetailTable = true;
                result.push(line);
                continue;
            }
            if (inDetailTable) {
                if (stripped.startsWith('|') && (stripped.includes('---') || stripped.includes(':--') || stripped.includes('--:'))) {
                    result.push(cleaned);
                    continue;
                }
                if (!stripped) { result.push(line); continue; }
                if (!stripped.startsWith('|')) {
                    inDetailTable = false;
                    result.push(cleaned);
                    continue;
                }
                // 清理表格行中的时间戳引用
                cleaned = cleaned.replace(/\s*\[\d{4}-\d{2}-\d{2}\]([^\|])*/g, ' $1');
                cleaned = cleaned.replace(/\s*\|\s*/g, ' | ');
                cleaned = cleaned.replace(/\|\s*\|\s*$/g, '|');
                result.push(cleaned);
                continue;
            }

            if (cleanedStripped) result.push(cleaned);
            else if (stripped) { /* 清理后为空，跳过 */ }
            else result.push(line);
        }
        return result.join('\n');
    }

}

ReportGenerator.generateAll = async function(analyses, personName = '你', aiClient) {
    const generator = new ReportGenerator();
    const personal = await generator.generatePersonalReport(analyses, personName, aiClient);
    const ai = await generator.generateAIReport(analyses, personName);
    return { personal, ai };
};