// ==================== 命运塔罗 - 纯前端版 ====================

// ==================== 1. 配置与常量 ====================

// API配置 - 内置GLM-4-Flash（免费）
const BUILT_IN_API = {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    key: 'a30427bb785f40fba461cf17fe7ef279.Y0oCBkAAS9La24uk'
};

// 22张大阿尔卡那
const TAROT_CARDS = [
    { name: "观察者觉醒", meaning: "新的视角，重新开始", suit: "风", fortune: "中" },
    { name: "创造之力", meaning: "行动的时候到了", suit: "火", fortune: "吉" },
    { name: "内在声音", meaning: "相信直觉", suit: "水", fortune: "吉" },
    { name: "丰盛时刻", meaning: "能量充足，可以展开", suit: "土", fortune: "吉" },
    { name: "秩序建立", meaning: "建立规则，掌控局面", suit: "火", fortune: "吉" },
    { name: "导师指引", meaning: "寻求智慧，学习成长", suit: "土", fortune: "吉" },
    { name: "命运之恋", meaning: "重要的相遇与选择", suit: "风", fortune: "吉" },
    { name: "勇者之车", meaning: "勇往直前，突破障碍", suit: "水", fortune: "吉" },
    { name: "平衡之道", meaning: "调整心态，寻找平衡", suit: "风", fortune: "吉" },
    { name: "隐者之光", meaning: "独处思考，寻找答案", suit: "土", fortune: "中" },
    { name: "命运之轮", meaning: "周期转折，命运转动", suit: "火", fortune: "吉" },
    { name: "内在力量", meaning: "温柔的力量，坚持信念", suit: "火", fortune: "吉" },
    { name: "逆向思考", meaning: "换个角度看问题", suit: "水", fortune: "中" },
    { name: "死亡与重生", meaning: "结束旧的，迎接新的", suit: "水", fortune: "中" },
    { name: "和谐之道", meaning: "调和矛盾，追求和谐", suit: "火", fortune: "吉" },
    { name: "黑暗之影", meaning: "面对恐惧，看清真相", suit: "土", fortune: "凶" },
    { name: "破局之时", meaning: "打破束缚，重新出发", suit: "火", fortune: "凶" },
    { name: "希望之星", meaning: "保持希望，等待曙光", suit: "风", fortune: "吉" },
    { name: "月光指引", meaning: "倾听内心，看清幻觉", suit: "水", fortune: "凶" },
    { name: "光明照耀", meaning: "清晰明了，成功在望", suit: "火", fortune: "吉" },
    { name: "审判时刻", meaning: "回顾过去，做出决定", suit: "火", fortune: "中" },
    { name: "圆满之境", meaning: "完成使命，达到目标", suit: "土", fortune: "吉" }
];

// 幸运元素映射
const LUCKY_MAP = {
    '火': { color: '红色', colorHex: '#e74c3c', item: '辛辣食物或红色饰品', element: '蜡烛、阳光', advice: '穿一件红色衣服，或吃一顿辣的' },
    '水': { color: '蓝色', colorHex: '#3498db', item: '流质食物或蓝色饰品', element: '水、月光', advice: '多喝水，佩戴蓝色饰品' },
    '风': { color: '黄色', colorHex: '#f1c40f', item: '金属饰品或黄色物品', element: '风、思维', advice: '戴一件金属饰品，或穿黄色' },
    '土': { color: '绿色', colorHex: '#2ecc71', item: '植物或绿色饰品', element: '大地、树木', advice: '接触植物，穿绿色衣服' }
};

// ==================== 2. 全局状态 ====================
let fateProfile = {};
let selectedCards = [];
let userQuestion = '';
let importedReport = ''; // 从观己导入的个人阅读报告

// ==================== 3. 初始化与事件绑定 ====================
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('tarot_fate_profile');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.energy) {
                fateProfile = parsed;
                showStep(2);
            }
        } catch(e) {}
    }

    // 恢复已导入的报告
    const savedReport = localStorage.getItem('tarot_imported_report');
    if (savedReport) {
        importedReport = savedReport;
        updateReportUI();
    }

    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            const question = option.parentElement.dataset.question;
            const value = option.dataset.value;
            option.parentElement.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            fateProfile[question] = value;
            const required = ['energy', 'timing', 'awareness'];
            const allAnswered = required.every(q => fateProfile[q]);
            document.getElementById('nextToQuestion').disabled = !allAnswered;
        });
    });

    Object.keys(fateProfile).forEach(question => {
        const container = document.querySelector(`[data-question="${question}"]`);
        if (container && question !== 'openConcern') {
            const opt = container.querySelector(`[data-value="${fateProfile[question]}"]`);
            if (opt) opt.classList.add('selected');
        }
    });
    document.getElementById('nextToQuestion').addEventListener('click', () => {
        delete fateProfile.openConcern;
        localStorage.setItem('tarot_fate_profile', JSON.stringify(fateProfile));
        updateAtmosphere(fateProfile);
        showStep(2);
    });

    document.getElementById('backToQuestionnaire').addEventListener('click', () => showStep(1));

    document.getElementById('startReading').addEventListener('click', () => {
        userQuestion = document.getElementById('userQuestion').value.trim();
        if (!userQuestion) { alert('请输入你的问题'); return; }
        startMeditation(() => {
            showStep(3);
            shuffleCards();
        });
    });

    document.querySelectorAll('.tarot-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!card.classList.contains('revealed')) revealCard(card);
        });
    });

    document.getElementById('revealAllCards').addEventListener('click', () => {
        document.querySelectorAll('.tarot-card:not(.revealed)').forEach(card => revealCard(card));
    });

    document.getElementById('getReading').addEventListener('click', () => getAIReading());

    document.getElementById('newReading').addEventListener('click', () => {
        document.getElementById('userQuestion').value = '';
        document.querySelectorAll('.tarot-card').forEach(card => card.classList.remove('revealed'));
        document.getElementById('revealAllCards').classList.remove('hidden');
        document.getElementById('getReading').classList.add('hidden');
        document.getElementById('getReading').disabled = true;
        document.getElementById('readingResult').innerHTML = '';
        document.getElementById('readingLoading').classList.remove('hidden');
        document.getElementById('readingContent').classList.add('hidden');
        const overlay = document.getElementById('atmosphere-overlay');
        if (overlay) overlay.style.background = 'transparent';
        const cardAtm = document.getElementById('card-atmosphere');
        if (cardAtm) cardAtm.className = '';

        const reevaluate = confirm('是否要重新进行命运评估？\n\n点击"确定"重新评估\n点击"取消"使用之前的评估');
        if (reevaluate) {
            localStorage.removeItem('tarot_fate_profile');
            fateProfile = {};
            document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            document.getElementById('nextToQuestion').disabled = true;
            showStep(1);
        } else {
            showStep(2);
            displayFateProfile();
        }
    });

    const required = ['energy', 'timing', 'awareness'];
    const allAnswered = required.every(q => fateProfile[q]);
    document.getElementById('nextToQuestion').disabled = !allAnswered;
    if (fateProfile.energy) displayFateProfile();
});

// ==================== 4. 界面流程控制 ====================
function showStep(stepNumber) {
    document.querySelectorAll('.step-item').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < stepNumber) step.classList.add('completed');
        else if (index + 1 === stepNumber) step.classList.add('active');
    });
    document.getElementById('questionnaire').classList.toggle('hidden', stepNumber !== 1);
    document.getElementById('questionInput').classList.toggle('hidden', stepNumber !== 2);
    document.getElementById('cardDrawing').classList.toggle('hidden', stepNumber !== 3);
    document.getElementById('aiReading').classList.toggle('hidden', stepNumber !== 4);
    if (stepNumber === 2) displayFateProfile();
}

function displayFateProfile() {
    const energyMap = { 'fear': '恐惧驱动（焦虑、害怕失去）', 'hope': '希望驱动（期待、追求理想）', 'neutral': '中性（平静）' };
    const timingMap = { 'rising': '上升期（成长、机会、能量充沛）', 'stable': '稳定期（平稳、维持、积累）', 'declining': '下降期（消耗、压力、需要调整）', 'turning': '转折期（变化、选择、关键节点）' };
    const awarenessMap = { 'clear': '觉知清晰（看清方向）', 'partial': '部分觉知（正在看清）', 'unclear': '觉知模糊（仍在迷茫）' };

    document.getElementById('fateProfileText').innerHTML = `
        <strong>能量状态：</strong>${energyMap[fateProfile.energy]}<br>
        <strong>时间阶段：</strong>${timingMap[fateProfile.timing]}<br>
        <strong>觉知程度：</strong>${awarenessMap[fateProfile.awareness]}
    `;
}

// ==================== 5. 音效系统 ====================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playShuffleSound() {
    try {
        const ctx = ensureAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
}

function playFlipSound() {
    try {
        const ctx = ensureAudioCtx();
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(ctx.currentTime);
    } catch(e) {}
}

// ==================== 6. 洗牌与翻牌 ====================
function shuffleCards() {
    selectedCards = [];
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    selectedCards = shuffled.slice(0, 3).map(c => ({
        ...c,
        reversed: Math.random() < 0.5  // 50%概率逆位
    }));

    const cards = document.querySelectorAll('.tarot-card');
    cards.forEach((card, i) => {
        card.classList.remove('revealed', 'glow');
        setTimeout(() => { card.classList.add('shuffling'); playShuffleSound(); }, i * 100);
        setTimeout(() => { card.classList.remove('shuffling'); void card.offsetWidth; card.classList.add('shuffling'); playShuffleSound(); }, i * 100 + 400);
        setTimeout(() => { card.classList.remove('shuffling'); }, i * 100 + 1200);
    });
}

function revealCard(cardElement) {
    if (cardElement.classList.contains('revealed')) return;
    const position = cardElement.dataset.position;
    const cardIndex = position === 'past' ? 0 : position === 'present' ? 1 : 2;
    const card = selectedCards[cardIndex];

    const reversedMark = card.reversed ? ' (逆位)' : '';
    cardElement.querySelector('.card-name').textContent = card.name + reversedMark;
    cardElement.querySelector('.card-meaning').textContent = card.reversed ? '阻碍/延迟/内省' : card.meaning;

    playFlipSound();
    cardElement.classList.add('revealed', 'glow');
    setTimeout(() => cardElement.classList.remove('glow'), 600);

    const allRevealed = document.querySelectorAll('.tarot-card.revealed').length === 3;
    if (allRevealed) {
        document.getElementById('revealAllCards').classList.add('hidden');
        document.getElementById('getReading').classList.remove('hidden');
        document.getElementById('getReading').disabled = false;
        updateCardAtmosphere(selectedCards);
    }
}

// ==================== 7. AI 调用 ====================
function buildPrompt(question, cards, profile) {
    const now = new Date();
    const currentDate = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

    const cardsText = cards.map(c => {
        const rev = c.reversed ? '（逆位）' : '（正位）';
        return `- ${c.position}：${c.name} ${rev}，含义：${c.reversed ? '阻碍、延迟、内省、需要重新审视' : c.meaning}`;
    }).join('\n');

    const energyMap = { 'fear': '恐惧驱动（焦虑、害怕失去）', 'hope': '希望驱动（期待、追求理想）', 'neutral': '中性（平静）' };
    const timingMap = { 'rising': '上升期', 'stable': '稳定期', 'declining': '下降期', 'turning': '转折期' };
    const awarenessMap = { 'clear': '觉知清晰', 'partial': '部分觉知', 'unclear': '觉知模糊' };

    const profileText = `能量：${energyMap[profile.energy] || '未知'}
阶段：${timingMap[profile.timing] || '未知'}
觉知：${awarenessMap[profile.awareness] || '未知'}`;

    // 报告部分（可选）
    const reportSection = importedReport
        ? `\n【用户的人生经历（来自观己个人阅读报告）】\n以下内容是用户从自己的聊天记录中提取的人生经历，记录了用户这些年走过的路和经历的事。请结合这些经历来理解用户，让占卜解读更贴合用户的实际人生。\n${importedReport}\n`
        : '';

    return `你是命运塔罗占卜师。你温暖、不故弄玄虚、不说教——你的任务是用塔罗为用户做一次占卜。

【设计说明】
以下信息分为三部分：
1. 用户画像：通过 3 个问题了解用户当下的能量状态、人生阶段和觉知程度。目的是让塔罗占卜能结合用户当前的真实状态，而不是凭空解读。
2. 塔罗牌：从 22 张牌中随机抽取 3 张（过去/现在/未来），每张牌 50% 概率逆位。随机性代表命运的未知，而牌面的象征意义提供了解读的切入点。
3. 用户的人生经历（可选）：如果提供了，说明用户希望AI结合其真实经历来解读，让占卜更贴合用户的实际情况。${reportSection ? '' : '（本次未提供）'}

请作为一个真正的塔罗占卜师，基于这些信息为用户占卜，而不是做心理分析。${reportSection ? '特别注意：用户提供了人生经历，请在解读时结合这些经历来理解用户当前的问题，让占卜更有针对性。' : ''}

【当前日期】${currentDate}
【用户的问题】${question}
【用户当前状态】
${profileText}

【抽到的塔罗牌（三牌阵）】
${cardsText}

注意：牌面有正位和逆位之分。逆位的牌不代表"坏"，而是表示该牌的能量受到阻碍、需要内省、或者事情在延迟——请结合用户当前状态解读。

请结合以上信息，为用户做一次完整的塔罗占卜解读。建议结构（不强制）：
1. 对用户当前状态的感知（基于用户的画像${reportSection ? '和人生经历' : ''}）
2. 三张牌之间的因果关系（过去如何影响现在，现在如何走向未来）
3. 针对用户具体问题的占卜结果和建议
4. 整体能量的总结

自由发挥，用你真实的占卜风格解读。`;
}

async function getAIReading() {
    showStep(4);
    const cards = selectedCards.map((card, i) => ({
        ...card,
        position: i === 0 ? '过去' : i === 1 ? '现在' : '未来',
        displayName: card.name + (card.reversed ? '（逆位）' : '（正位）')
    }));

    const prompt = buildPrompt(userQuestion, cards, fateProfile);

    try {
        const reading = await callAI(prompt);
        displayReading(reading, cards);
    } catch (error) {
        document.getElementById('readingLoading').classList.add('hidden');
        document.getElementById('readingContent').classList.remove('hidden');
        document.getElementById('readingResult').innerHTML = `
            <div class="reading-section"><h3>❌ 解读失败</h3><p>${error.message}</p></div>
            <div class="buttons"><button class="btn" onclick="showStep(3)">返回抽牌</button></div>
        `;
    }
}

async function callAI(prompt) {
    const maxRetries = 3;
    const timeoutMs = 300000;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(BUILT_IN_API.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUILT_IN_API.key}` },
                body: JSON.stringify({
                    model: BUILT_IN_API.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8,
                    max_tokens: 2000
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API错误(${response.status}): ${errText}`);
            }
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            }
            throw new Error('API返回格式异常');
        } catch (error) {
            clearTimeout(timeoutId);
            const isRetryable = error.message === 'Failed to fetch' || error.name === 'AbortError';
            if (isRetryable && attempt < maxRetries) {
                const waitMs = Math.pow(2, attempt) * 1000;
                console.warn(`${error.name === 'AbortError' ? '请求超时' : '网络错误'}，${waitMs/1000}s后重试(${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟无响应）。可能原因：①API余额不足 ②网络不稳定 ③prompt过长。');
            }
            throw error;
        }
    }
}

// ==================== 8. 结果展示 ====================
function displayReading(reading, cards) {
    document.getElementById('readingLoading').classList.add('hidden');
    document.getElementById('readingContent').classList.remove('hidden');

    const resultDiv = document.getElementById('readingResult');
    let html = '';

    // 三张牌展示
    html += `<div class="reading-section"><h3>🃏 你的塔罗牌</h3>`;
    cards.forEach(c => {
        const fortuneColor = c.fortune === '吉' ? '#2ecc71' : c.fortune === '凶' ? '#e74c3c' : '#f39c12';
        const revMark = c.reversed ? ' 🔄' : '';
        html += `<p style="margin:6px 0;"><strong>${c.position}：</strong>${c.name}${revMark} <span style="color:${fortuneColor};font-size:0.85em;">${c.reversed ? '（逆位·阻碍/内省）' : '（' + c.meaning + '）'}</span></p>`;
    });
    html += `</div>`;

    // AI 解读
    html += `<div class="reading-section"><h3>✨ 塔罗解读</h3><p>${reading.replace(/\n/g, '<br>')}</p></div>`;

    // 幸运指引
    const lucky = getLuckyElement(cards);
    html += `<div class="reading-section" style="border-left-color:${lucky.colorHex};background:linear-gradient(135deg,rgba(255,255,255,0.03),${lucky.colorHex}11);">
        <h3>🍀 今日幸运指引</h3>
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:8px;">
            <div style="flex:1;min-width:120px;">
                <div style="font-size:0.85em;color:#888;">幸运色</div>
                <div style="font-size:1.2em;color:${lucky.colorHex};font-weight:bold;">${lucky.color}</div>
                <div style="width:30px;height:30px;border-radius:50%;background:${lucky.colorHex};margin-top:4px;opacity:0.7;"></div>
            </div>
            <div style="flex:1;min-width:120px;">
                <div style="font-size:0.85em;color:#888;">幸运物</div>
                <div style="font-size:1em;">${lucky.item}</div>
            </div>
            <div style="flex:1;min-width:120px;">
                <div style="font-size:0.85em;color:#888;">元素能量</div>
                <div style="font-size:1em;">${lucky.element}</div>
            </div>
        </div>
        <div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.9em;color:#bdc3c7;">
            💡 建议：${lucky.advice}，增强${lucky.suit}元素能量。
        </div>
    </div>`;

    // 反馈
    const readingId = Date.now().toString(36);
    html += `<div id="feedback-section" style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;text-align:center;">
        <p style="color:#bdc3c7;margin-bottom:12px;">这个分析对你有帮助吗？</p>
        <button onclick="submitFeedback('${readingId}', 'helpful')" style="margin:0 6px;padding:8px 20px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:8px;color:#2ecc71;cursor:pointer;font-size:14px;">👍 有帮助</button>
        <button onclick="submitFeedback('${readingId}', 'neutral')" style="margin:0 6px;padding:8px 20px;background:rgba(241,196,15,0.15);border:1px solid rgba(241,196,15,0.3);border-radius:8px;color:#f1c40f;cursor:pointer;font-size:14px;">😐 一般</button>
        <button onclick="submitFeedback('${readingId}', 'unhelpful')" style="margin:0 6px;padding:8px 20px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3);border-radius:8px;color:#e74c3c;cursor:pointer;font-size:14px;">👎 不准</button>
    </div>`;

    resultDiv.innerHTML = html;
    document.getElementById('readingContent').scrollIntoView({ behavior: 'smooth', block: 'start' });

    saveReadingHistory(reading, cards);
}

// ==================== 9. 工具函数 ====================
function getLuckyElement(cards) {
    const suitCount = {};
    cards.forEach(c => { suitCount[c.suit] = (suitCount[c.suit] || 0) + 1; });
    const dominantSuit = Object.entries(suitCount).sort((a, b) => b[1] - a[1])[0][0];
    return { suit: dominantSuit, ...LUCKY_MAP[dominantSuit] };
}

function copyReadingText() {
    const resultDiv = document.getElementById('readingResult');
    if (!resultDiv) return;
    const text = resultDiv.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyReading');
        btn.textContent = '✓ 已复制';
        setTimeout(() => btn.textContent = '📋 复制解读', 1500);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const btn = document.getElementById('copyReading');
        btn.textContent = '✓ 已复制';
        setTimeout(() => btn.textContent = '📋 复制解读', 1500);
    });
}

// ==================== 导入/清除个人阅读报告 ====================
function importReportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        importedReport = e.target.result.trim();
        localStorage.setItem('tarot_imported_report', importedReport);
        updateReportUI();
        alert('✓ 个人阅读报告已导入！AI将结合你的人生经历进行占卜解读。');
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = ''; // 重置 input，允许重复导入同一文件
}

function clearReport() {
    importedReport = '';
    localStorage.removeItem('tarot_imported_report');
    updateReportUI();
}

function updateReportUI() {
    const status = document.getElementById('reportStatus');
    const clearBtn = document.getElementById('clearReportBtn');
    if (!status) return;
    if (importedReport) {
        const preview = importedReport.substring(0, 50).replace(/\n/g, ' ') + '...';
        status.innerHTML = `📖 已导入个人阅读报告（${preview}）`;
        if (clearBtn) clearBtn.style.display = 'inline-block';
    } else {
        status.innerHTML = '📖 可导入观己个人阅读报告，让AI结合你的经历占卜';
        if (clearBtn) clearBtn.style.display = 'none';
    }
}

async function saveAsImage() {
    const resultDiv = document.getElementById('readingResult');
    const btn = document.getElementById('savePoster');
    if (!resultDiv) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🎨 生成中...';
    btn.disabled = true;
    try {
        const canvas = await html2canvas(resultDiv, { backgroundColor: '#1a1a2e', scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `命运塔罗解读_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
        link.click();
    } catch (err) {
        console.error('海报生成失败:', err);
        const tip = document.createElement('div');
        tip.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(231,76,60,0.95);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:9999;text-align:center;max-width:320px;';
        tip.innerHTML = '🖼️ 海报生成失败<br><span style="font-size:12px;opacity:0.8;">请尝试"复制解读"后手动保存</span>';
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 3000);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==================== 10. 氛围系统 ====================
function updateAtmosphere(profile) {
    const overlay = document.getElementById('atmosphere-overlay');
    const tip = document.getElementById('atmosphere-tip');
    if (!overlay || !tip) return;

    let bgColor = 'transparent';
    let tipText = '';
    if (profile.energy === 'fear') {
        bgColor = 'radial-gradient(circle at 50% 50%, rgba(52,73,94,0.15) 0%, transparent 70%)';
        tipText = '❄️ 你现在的能量有点紧绷，让塔罗帮你看清一点';
    } else if (profile.energy === 'hope') {
        bgColor = 'radial-gradient(circle at 50% 50%, rgba(243,156,18,0.08) 0%, transparent 70%)';
        tipText = '☀️ 你内心有光，塔罗会帮你找到方向';
    }
    if (profile.awareness === 'unclear' && !tipText) tipText = '🌊 迷雾中的你，让塔罗照亮一条路';
    else if (profile.awareness === 'clear' && !tipText) tipText = '🔮 你的直觉很准，塔罗会印证你的判断';

    overlay.style.background = bgColor;
    if (tipText) {
        tip.textContent = tipText;
        tip.classList.add('show');
        setTimeout(() => tip.classList.remove('show'), 4000);
    }
}

function startMeditation(callback) {
    const overlay = document.getElementById('meditation-overlay');
    const textEl = document.getElementById('meditationText');
    const countdownEl = document.getElementById('meditationCountdown');
    if (!overlay) { callback(); return; }

    overlay.classList.add('active');
    const messages = ['请闭上眼睛，默念你的问题...', '感受能量的流动...', '让塔罗感应你的命运...'];
    let step = 0;
    let remaining = 4;

    function showNext() {
        if (step < messages.length) {
            textEl.classList.remove('visible');
            setTimeout(() => { textEl.textContent = messages[step]; textEl.classList.add('visible'); step++; }, 300);
        }
    }

    setTimeout(() => textEl.classList.add('visible'), 100);
    setTimeout(showNext, 1200);
    setTimeout(showNext, 2600);

    const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) countdownEl.textContent = remaining + '秒后抽牌...';
        else clearInterval(countdownInterval);
    }, 1000);
    countdownEl.textContent = remaining + '秒后抽牌...';

    setTimeout(() => {
        overlay.classList.remove('active');
        textEl.classList.remove('visible');
        countdownEl.textContent = '';
        callback();
    }, 3800);
}

function updateCardAtmosphere(cards) {
    const atm = document.getElementById('card-atmosphere');
    if (!atm) return;
    atm.className = '';
    atm.id = 'card-atmosphere';

    const mainCard = cards[1];
    const hasNegative = cards.some(c => c.fortune === '凶');
    const hasPositive = cards.some(c => c.fortune === '吉');

    if (mainCard.name === '月光指引' || mainCard.name === '黑暗之影') atm.classList.add('fog', 'noise');
    else if (mainCard.name === '破局之时' || mainCard.name === '死亡与重生') atm.classList.add('dark');
    else if (mainCard.name === '光明照耀' || mainCard.name === '希望之星') atm.classList.add('glow');
    else if (hasNegative && !hasPositive) atm.classList.add('dark');
    else if (hasPositive && !hasNegative) atm.classList.add('glow');
}

// ==================== 11. 反馈与历史 ====================
function submitFeedback(readingId, feedback) {
    const feedbacks = JSON.parse(localStorage.getItem('tarot_feedbacks') || '[]');
    feedbacks.push({ id: readingId, feedback, question: userQuestion, timestamp: Date.now() });
    localStorage.setItem('tarot_feedbacks', JSON.stringify(feedbacks));

    const section = document.getElementById('feedback-section');
    if (section) {
        const labels = { helpful: '👍 感谢反馈！', neutral: '😐 收到，会继续改进', unhelpful: '👎 感谢诚实反馈' };
        section.innerHTML = `<p style="color:${feedback === 'helpful' ? '#2ecc71' : feedback === 'unhelpful' ? '#e74c3c' : '#f1c40f'};font-size:1.1em;">${labels[feedback]}</p>`;
    }
}

function saveReadingHistory(reading, cards) {
    const history = JSON.parse(localStorage.getItem('tarot_history') || '[]');
    history.unshift({
        id: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        question: userQuestion,
        cards: cards.map(c => ({ name: c.name, fortune: c.fortune, position: c.position, reversed: c.reversed })),
        profile: { ...fateProfile },
        reading: reading.substring(0, 500),
        lucky: getLuckyElement(cards)
    });
    if (history.length > 20) history.length = 20;
    localStorage.setItem('tarot_history', JSON.stringify(history));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem('tarot_history') || '[]');
    let html = '';

    if (history.length === 0) {
        html = '<div style="text-align:center;color:#7f8c8d;padding:40px;">暂无占卜记录</div>';
    } else {
        history.forEach((h, i) => {
            const cardsStr = h.cards.map(c => {
                const revMark = c.reversed ? ' 🔄' : '';
                return `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:4px;background:${c.fortune === '凶' ? 'rgba(231,76,60,0.15)' : c.fortune === '吉' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.05)'};color:${c.fortune === '凶' ? '#e74c3c' : c.fortune === '吉' ? '#2ecc71' : '#bdc3c7'};font-size:0.8em;">${c.position}: ${c.name}${revMark}</span>`;
            }).join('');
            html += `<div style="padding:12px 16px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${h.lucky ? h.lucky.colorHex : '#f39c12'};cursor:pointer;" onclick="toggleHistoryDetail(${i})">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.85em;color:#7f8c8d;">${h.date}</div>
                </div>
                <div style="margin-top:4px;font-size:0.95em;">${h.question}</div>
                <div style="margin-top:6px;">${cardsStr}</div>
                <div id="history-detail-${i}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);font-size:0.85em;color:#bdc3c7;max-height:200px;overflow-y:auto;">
                    ${h.reading ? h.reading.replace(/\n/g, '<br>') : ''}
                </div>
            </div>`;
        });
    }

    let modal = document.getElementById('history-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,10,26,0.95);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style="background:#1a1a2e;border-radius:16px;max-width:600px;width:100%;max-height:80vh;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.05);">
            <h3 style="color:#f39c12;margin:0;">📜 占卜历史</h3>
            <button onclick="closeHistory()" style="background:none;border:none;color:#888;font-size:1.3em;cursor:pointer;">✕</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;max-height:calc(80vh - 60px);">
            ${html}
        </div>
    </div>`;
    modal.style.display = 'flex';
}

function closeHistory() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.style.display = 'none';
}

function toggleHistoryDetail(index) {
    const el = document.getElementById(`history-detail-${index}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
