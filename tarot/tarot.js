// ==================== 命运塔罗 - 纯前端版 ====================

// ==================== 1. 配置与常量 ====================

// API配置 - 内置GLM-4-Flash（免费）
const BUILT_IN_API = {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    key: 'a30427bb785f40fba461cf17fe7ef279.Y0oCBkAAS9La24uk'
};

// 塔罗牌数据（22张大阿尔卡那，可扩展）
// 格式：name=牌名, meaning=牌义, element=对应传统牌, timeHint=阶段, timeSpeed=速度, fortune=吉凶
const TAROT_CARDS = [
    { name: "观察者觉醒", meaning: "新的视角，重新开始", element: "愚者", suit: "风", timeHint: "开始阶段", timeSpeed: "慢", fortune: "中" },
    { name: "创造之力", meaning: "行动的时候到了", element: "魔术师", suit: "火", timeHint: "行动阶段", timeSpeed: "快", fortune: "吉" },
    { name: "内在声音", meaning: "相信直觉", element: "女祭司", suit: "水", timeHint: "等待阶段", timeSpeed: "慢", fortune: "吉" },
    { name: "丰盛时刻", meaning: "能量充足，可以展开", element: "皇后", suit: "土", timeHint: "收获阶段", timeSpeed: "快", fortune: "吉" },
    { name: "秩序建立", meaning: "建立规则，掌控局面", element: "皇帝", suit: "火", timeHint: "稳定阶段", timeSpeed: "中", fortune: "吉" },
    { name: "导师指引", meaning: "寻求智慧，学习成长", element: "教皇", suit: "土", timeHint: "学习阶段", timeSpeed: "中", fortune: "吉" },
    { name: "命运之恋", meaning: "重要的相遇与选择", element: "恋人", suit: "风", timeHint: "选择阶段", timeSpeed: "中", fortune: "吉" },
    { name: "勇者之车", meaning: "勇往直前，突破障碍", element: "战车", suit: "水", timeHint: "突破阶段", timeSpeed: "快", fortune: "吉" },
    { name: "平衡之道", meaning: "调整心态，寻找平衡", element: "正义", suit: "风", timeHint: "调整阶段", timeSpeed: "中", fortune: "吉" },
    { name: "隐者之光", meaning: "独处思考，寻找答案", element: "隐者", suit: "土", timeHint: "思考阶段", timeSpeed: "慢", fortune: "中" },
    { name: "命运之轮", meaning: "周期转折，命运转动", element: "命运之轮", suit: "火", timeHint: "转折点", timeSpeed: "中", fortune: "吉" },
    { name: "内在力量", meaning: "温柔的力量，坚持信念", element: "力量", suit: "火", timeHint: "坚持阶段", timeSpeed: "中", fortune: "吉" },
    { name: "逆向思考", meaning: "换个角度看问题", element: "倒吊人", suit: "水", timeHint: "改变阶段", timeSpeed: "慢", fortune: "中" },
    { name: "死亡与重生", meaning: "结束旧的，迎接新的", element: "死神", suit: "水", timeHint: "转折点", timeSpeed: "中", fortune: "中" },
    { name: "和谐之道", meaning: "调和矛盾，追求和谐", element: "节制", suit: "火", timeHint: "调和阶段", timeSpeed: "中", fortune: "吉" },
    { name: "黑暗之影", meaning: "面对恐惧，看清真相", element: "恶魔", suit: "土", timeHint: "挑战阶段", timeSpeed: "慢", fortune: "凶" },
    { name: "破局之时", meaning: "打破束缚，重新出发", element: "塔", suit: "火", timeHint: "突变阶段", timeSpeed: "快", fortune: "凶" },
    { name: "希望之星", meaning: "保持希望，等待曙光", element: "星星", suit: "风", timeHint: "等待阶段", timeSpeed: "慢", fortune: "吉" },
    { name: "月光指引", meaning: "倾听内心，看清幻觉", element: "月亮", suit: "水", timeHint: "迷茫阶段", timeSpeed: "慢", fortune: "凶" },
    { name: "光明照耀", meaning: "清晰明了，成功在望", element: "太阳", suit: "火", timeHint: "成功阶段", timeSpeed: "快", fortune: "吉" },
    { name: "审判时刻", meaning: "回顾过去，做出决定", element: "审判", suit: "火", timeHint: "决定阶段", timeSpeed: "中", fortune: "中" },
    { name: "圆满之境", meaning: "完成使命，达到目标", element: "世界", suit: "土", timeHint: "完成阶段", timeSpeed: "快", fortune: "吉" }
];

// ==================== 2. 全局状态 ====================
let fateProfile = {};
let selectedCards = [];
let userQuestion = '';

// ==================== 3. 初始化与事件绑定 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 加载已保存的命运画像
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

    // 问卷选项点击
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            const question = option.parentElement.dataset.question;
            const value = option.dataset.value;
            option.parentElement.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            fateProfile[question] = value;
            // 检查是否所有5个必填问题都已回答
            const required = ['energy', 'direction', 'relation', 'timing', 'awareness'];
            const allAnswered = required.every(q => fateProfile[q]);
            document.getElementById('nextToQuestion').disabled = !allAnswered;
        });
    });

    // 恢复已选选项
    Object.keys(fateProfile).forEach(question => {
        const optionsContainer = document.querySelector(`[data-question="${question}"]`);
        if (optionsContainer && question !== 'openConcern') {
            const option = optionsContainer.querySelector(`[data-value="${fateProfile[question]}"]`);
            if (option) option.classList.add('selected');
        }
    });
    if (fateProfile.openConcern) {
        const el = document.getElementById('openConcern');
        if (el) el.value = fateProfile.openConcern;
    }

    // 下一步按钮
    document.getElementById('nextToQuestion').addEventListener('click', () => {
        const concern = document.getElementById('openConcern');
        if (concern) fateProfile.openConcern = concern.value.trim();
        else delete fateProfile.openConcern;
        localStorage.setItem('tarot_fate_profile', JSON.stringify(fateProfile));
        updateAtmosphere(fateProfile);
        showStep(2);
    });

    document.getElementById('backToQuestionnaire').addEventListener('click', () => {
        showStep(1);
    });

    document.getElementById('startReading').addEventListener('click', () => {
        userQuestion = document.getElementById('userQuestion').value.trim();
        if (!userQuestion) { alert('请输入你的问题'); return; }
        // 冥想引导（3秒倒计时 + 呼吸动画）
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
        document.querySelectorAll('.tarot-card').forEach(card => {
            card.classList.remove('revealed');
        });
        document.getElementById('revealAllCards').classList.remove('hidden');
        document.getElementById('getReading').classList.add('hidden');
        document.getElementById('getReading').disabled = true;
        document.getElementById('readingResult').innerHTML = '';
        document.getElementById('readingLoading').classList.remove('hidden');
        document.getElementById('readingContent').classList.add('hidden');
        // Reset atmosphere
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

    // Check required questions for enabling next button
    const required = ['energy', 'direction', 'relation', 'timing', 'awareness'];
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
    const energyMap = { 'fear': '恐惧驱动（被动）', 'hope': '希望驱动（主动）', 'neutral': '中性（平静）' };
    const directionMap = { 'inward': '向内收敛（内省）', 'outward': '向外展开（行动）', 'balance': '平衡（两者兼顾）' };
    const relationMap = { 'entangled': '命运被纠缠（依赖外部）', 'independent': '命运独立（自主掌控）', 'uncertain': '不确定（摇摆状态）' };
    const timingMap = { 'rising': '上升期（成长、机会、能量充沛）', 'stable': '稳定期（平稳、维持、积累）', 'declining': '下降期（消耗、压力、需要调整）', 'turning': '转折期（变化、选择、关键节点）' };
    const awarenessMap = { 'clear': '觉知清晰（看清方向）', 'partial': '部分觉知（正在看清）', 'unclear': '觉知模糊（仍在迷茫）' };

    document.getElementById('fateProfileText').innerHTML = `
        <strong>能量状态：</strong>${energyMap[fateProfile.energy]}<br>
        <strong>方向倾向：</strong>${directionMap[fateProfile.direction]}<br>
        <strong>关系状态：</strong>${relationMap[fateProfile.relation]}<br>
        <strong>时间阶段：</strong>${timingMap[fateProfile.timing]}<br>
        <strong>觉知程度：</strong>${awarenessMap[fateProfile.awareness]}${fateProfile.openConcern ? '<br><strong>当前困扰：</strong>' + fateProfile.openConcern : ''}
    `;
}

// --- 音效系统（Web Audio API，无需外部文件） ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

// 洗牌音效：快速短促的纸张摩擦声
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

// 翻牌音效：轻微的纸张翻动声
function playFlipSound() {
    try {
        const ctx = ensureAudioCtx();
        // 白噪声模拟纸张声
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

// --- 洗牌（增强仪式感） ---
function shuffleCards() {
    selectedCards = [];
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    selectedCards = shuffled.slice(0, 3);

    // 洗牌动画 + 音效：3轮散开旋转
    const cards = document.querySelectorAll('.tarot-card');
    cards.forEach((card, i) => {
        card.classList.remove('revealed', 'glow');
        // 第1轮：偏移启动，每张卡错开100ms
        setTimeout(() => {
            card.classList.add('shuffling');
            playShuffleSound();
        }, i * 100);
        // 第2轮：再来一次
        setTimeout(() => {
            card.classList.remove('shuffling');
            void card.offsetWidth; // 强制重排触发重新动画
            card.classList.add('shuffling');
            playShuffleSound();
        }, i * 100 + 400);
        // 动画结束清理
        setTimeout(() => {
            card.classList.remove('shuffling');
        }, i * 100 + 1200);
    });
}

function revealCard(cardElement) {
    if (cardElement.classList.contains('revealed')) return;
    const position = cardElement.dataset.position;
    const cardIndex = position === 'past' ? 0 : position === 'present' ? 1 : 2;
    const card = selectedCards[cardIndex];

    // Set card content before flip
    cardElement.querySelector('.card-name').textContent = card.name;
    cardElement.querySelector('.card-meaning').textContent = card.meaning;

    // Flip animation + 音效 + 闪光
    playFlipSound();
    cardElement.classList.add('revealed', 'glow');
    setTimeout(() => cardElement.classList.remove('glow'), 600);

    const allRevealed = document.querySelectorAll('.tarot-card.revealed').length === 3;
    if (allRevealed) {
        document.getElementById('revealAllCards').classList.add('hidden');
        document.getElementById('getReading').classList.remove('hidden');
        document.getElementById('getReading').disabled = false;
        // 根据牌面更新背景氛围
        updateCardAtmosphere(selectedCards);
    }
}

// ==================== 5. 评分与计算引擎 ====================
function calculateTime(cards, fateProfile) {
    const currentYear = new Date().getFullYear();
    let yearOffset = 0;
    cards.forEach(card => {
        if (card.timeSpeed === '快') yearOffset += 0.5;
        else if (card.timeSpeed === '中') yearOffset += 1;
        else yearOffset += 1.5;
    });
    yearOffset = yearOffset / cards.length;
    // 命运画像修正
    const timing = fateProfile.timing;
    if (timing === 'rising') yearOffset *= 0.7;
    else if (timing === 'stable') yearOffset *= 0.9;
    else if (timing === 'declining') yearOffset *= 1.3;
    else if (timing === 'turning') yearOffset *= 0.5;
    if (fateProfile.awareness === 'clear') yearOffset *= 0.8;
    else if (fateProfile.awareness === 'unclear') yearOffset *= 1.2;
    const startYear = currentYear + Math.floor(yearOffset);
    const endYear = startYear + Math.max(1, Math.floor(yearOffset));
    return { finalTime: `${startYear}年 - ${endYear}年`, yearOffset: yearOffset.toFixed(1), startYear, endYear };
}

// --- 统一评分函数 ---
// 修复 isolate 幽灵代码：HTML 选项只有 entangled/independent/uncertain，没有 isolate
function calculateScore(cards, fateProfile) {
    let score = 50; // 基础分

    // 1. 牌面影响 (权重 60%)
    cards.forEach(card => {
        if (card.fortune === '吉') score += 8;
        else if (card.fortune === '凶') score -= 8;
    });

    // 2. 命运画像修正 (权重 40%)
    // 能量
    if (fateProfile.energy === 'fear') score -= 5;
    else if (fateProfile.energy === 'hope') score += 5;
    
    // 方向
    if (fateProfile.direction === 'inward') score -= 3;
    else if (fateProfile.direction === 'outward') score += 3;
    
    // 关系 (修复：isolate 不存在，entangled 才是消耗能量的选项)
    if (fateProfile.relation === 'independent') score += 5;
    else if (fateProfile.relation === 'entangled') score -= 2; // 纠缠消耗能量
    
    // 阶段
    if (fateProfile.timing === 'rising') score += 5;
    else if (fateProfile.timing === 'declining') score -= 5;
    
    // 觉知
    if (fateProfile.awareness === 'clear') score += 5;
    else if (fateProfile.awareness === 'unclear') score -= 5;

    return Math.max(10, Math.min(90, score));
}

// --- 共振/冲突机制：画像与牌面的化学反应 ---
function analyzeCardProfileRelation(cards, profile) {
    const relations = [];
    const mainCard = cards[1]; // 现在牌（核心）
    const pastCard = cards[0];
    const futureCard = cards[2];

    // 恐惧驱动 + 凶牌 = 恐惧共振（极度危险信号）
    if (profile.energy === 'fear' && mainCard.fortune === '凶') {
        relations.push({ type: '共振', level: 'danger', text: '【恐惧共振】：你内心的焦虑正在吸引负面事件的发生——这不是巧合，是典型的墨菲定律时刻。你的恐惧本身正在成为命运的推手。' });
    }
    // 希望驱动 + 凶牌 = 盲目冲突
    else if (profile.energy === 'hope' && mainCard.fortune === '凶') {
        relations.push({ type: '冲突', level: 'warning', text: '【盲目冲突】：你对外界的期待与现实的重击形成了巨大落差——你的希望可能建立在沙滩上，现在潮水来了。' });
    }
    // 恐惧驱动 + 吉牌 = 转机信号
    if (profile.energy === 'fear' && mainCard.fortune === '吉') {
        relations.push({ type: '转机', level: 'hope', text: '【恐惧中的转机】：即使你满心恐惧，命运的齿轮仍然在向好的方向转动——也许你害怕的事并不会发生。' });
    }
    // 上升期 + 死神/塔 = 逆势而行
    if (profile.timing === 'rising' && (mainCard.element === '死神' || mainCard.element === '塔')) {
        relations.push({ type: '冲突', level: 'warning', text: '【逆势而行】：在大环境上升期遭遇个人层面的结束，说明你需要主动断舍离才能跟上大趋势——旧的壳不脱掉，新的你长不出来。' });
    }
    // 下降期 + 吉牌 = 曙光初现
    if (profile.timing === 'declining' && mainCard.fortune === '吉') {
        relations.push({ type: '转机', level: 'hope', text: '【曙光初现】：在低谷中抽到吉牌是真正的转机——不是侥幸，是你之前承受的苦难终于要开始兑现回报了。' });
    }
    // 下降期 + 凶牌 = 深渊叠加
    if (profile.timing === 'declining' && mainCard.fortune === '凶') {
        relations.push({ type: '共振', level: 'danger', text: '【深渊叠加】：低谷遇上凶牌，内忧外患。此刻最重要的是止损——不是逆势翻盘，而是活下去、稳住阵脚。' });
    }
    // 觉知模糊 + 月亮 = 迷雾陷阱
    if (profile.awareness === 'unclear' && mainCard.element === '月亮') {
        relations.push({ type: '共振', level: 'danger', text: '【迷雾陷阱】：你本就看不清方向，月亮又放大了幻觉——此刻任何"感觉对了"的判断都可能出错。别做决定，等雾散。' });
    }
    // 觉知清晰 + 太阳/星星 = 确信共振
    if (profile.awareness === 'clear' && (mainCard.element === '太阳' || mainCard.element === '星星')) {
        relations.push({ type: '共振', level: 'hope', text: '【确信共振】：你的直觉很准，牌面也在给你绿灯——这是少有的"你可以相信自己的判断"的时刻。' });
    }
    // 纠缠关系 + 恋人/恶魔 = 命运捆绑
    if (profile.relation === 'entangled' && (mainCard.element === '恋人' || mainCard.element === '恶魔')) {
        relations.push({ type: '共振', level: 'warning', text: '【命运捆绑】：你与他人的纠缠正被牌面印证——无论是恋人还是恶魔，都指向同一件事：你的命运正被另一个人深刻地改变着。' });
    }
    // 过去凶 + 现在凶 = 连锁坠落
    if (pastCard.fortune === '凶' && mainCard.fortune === '凶') {
        relations.push({ type: '共振', level: 'danger', text: '【连锁坠落】：过去和现在的牌都在示警——你正处在一个下行螺旋中。如果不主动打破这个循环，未来牌也很难逆转。' });
    }
    // 过去凶 + 现在吉 = 破局时刻
    if (pastCard.fortune === '凶' && mainCard.fortune === '吉') {
        relations.push({ type: '转机', level: 'hope', text: '【破局时刻】：过去的苦难正在转化为现在的力量——你已经熬过了最难的阶段，现在是收获韧性的时候。' });
    }

    return relations;
}

// --- 幸运元素映射（基于牌面suit属性） ---
const LUCKY_MAP = {
    '火': { color: '红色', colorHex: '#e74c3c', item: '辛辣食物或红色饰品', element: '蜡烛、阳光', advice: '穿一件红色衣服，或吃一顿辣的' },
    '水': { color: '蓝色', colorHex: '#3498db', item: '流质食物或蓝色饰品', element: '水、月光', advice: '多喝水，佩戴蓝色饰品' },
    '风': { color: '黄色', colorHex: '#f1c40f', item: '金属饰品或黄色物品', element: '风、思维', advice: '戴一件金属饰品，或穿黄色' },
    '土': { color: '绿色', colorHex: '#2ecc71', item: '植物或绿色饰品', element: '大地、树木', advice: '接触植物，穿绿色衣服' }
};

function getLuckyElement(cards) {
    // 取三张牌中出现最多的suit
    const suitCount = {};
    cards.forEach(c => { suitCount[c.suit] = (suitCount[c.suit] || 0) + 1; });
    const dominantSuit = Object.entries(suitCount).sort((a, b) => b[1] - a[1])[0][0];
    return { suit: dominantSuit, ...LUCKY_MAP[dominantSuit] };
}

// 兼容旧接口：是否判断
function calculateYesNo(cards, fateProfile) {
    const score = calculateScore(cards, fateProfile);
    return { answer: score >= 50 ? '会' : '不会', probability: score };
}

// 兼容旧接口：概率计算
function calculateProbability(cards, fateProfile) {
    const score = calculateScore(cards, fateProfile);
    return { finalProbability: Math.min(95, score), base: 50, adjustment: score - 50 };
}

// --- 数量估测逻辑（区别于概率：把分数翻译成"人话"量级） ---
function calculateQuantity(cards, fateProfile) {
    const score = calculateScore(cards, fateProfile);
    let countText = "";
    let level = "";

    if (score >= 85) {
        countText = "非常多（5人以上）";
        level = "桃花旺盛";
    } else if (score >= 65) {
        countText = "不少（3-5人）";
        level = "桃花渐开";
    } else if (score >= 45) {
        countText = "少数（1-2人）";
        level = "暗藏玄机";
    } else {
        countText = "几乎没有（0人）";
        level = "需要等待";
    }

    // 画像修正（外向的人更容易被看到，修正量级）
    if (fateProfile.direction === 'outward') {
        if (level === '暗藏玄机') { countText = "少数但有机会增加（2-3人）"; level = "需要主动"; }
        else if (level === '需要等待') { countText = "暂无，但外向会带来机会（1人可能）"; level = "蓄势待发"; }
    }
    // 上升期额外加持
    if (fateProfile.timing === 'rising' && level !== '桃花旺盛') {
        countText = countText.replace(/（/, '→上升趋势（');
        level += '↑';
    }

    return { countText, level, rawScore: score };
}

function calculateJudgment(cards, fateProfile) {
    const prob = calculateProbability(cards, fateProfile);
    const score = calculateYesNo(cards, fateProfile);
    let judgment = prob.finalProbability >= 60 ? '倾向于是' : prob.finalProbability <= 40 ? '倾向于不是' : '尚不确定';
    return { judgment, probability: prob.finalProbability, yesScore: score.probability };
}

function calculateDecision(cards, fateProfile) {
    const prob = calculateProbability(cards, fateProfile);
    const fateWeight = calculateFateWeight(fateProfile);
    // 画像权重高→用户自我认知更可信→阈值适当降低（更容易给积极建议）
    // fateWeight范围15-45，默认30，每偏离10点调整5个阈值
    const weightOffset = (fateWeight - 30) / 2; // -7.5 ~ +7.5
    const adjustedProb = prob.finalProbability + weightOffset;
    let actionAdvice, riskLevel;
    if (adjustedProb >= 70) { actionAdvice = '积极行动'; riskLevel = '低风险'; }
    else if (adjustedProb >= 55) { actionAdvice = '可以行动，但需谨慎'; riskLevel = '中低风险'; }
    else if (adjustedProb >= 45) { actionAdvice = '观望为主，保持准备'; riskLevel = '中等风险'; }
    else if (adjustedProb >= 30) { actionAdvice = '暂缓行动，等待时机'; riskLevel = '中高风险'; }
    else { actionAdvice = '不建议行动'; riskLevel = '高风险'; }
    const fateInsights = [];
    if (fateProfile.energy === 'fear') fateInsights.push('恐惧驱动状态下容易做出保守或冲动决策，建议先冷静');
    if (fateProfile.timing === 'rising') fateInsights.push('当前处于上升期，时机有利');
    if (fateProfile.timing === 'declining') fateInsights.push('当前处于下降期，不建议冒险');
    if (fateProfile.timing === 'turning') fateInsights.push('当前处于转折期，选择尤其关键');
    if (fateProfile.awareness === 'unclear') fateInsights.push('觉知模糊，建议等看清局势再行动');
    if (fateProfile.direction === 'inward') fateInsights.push('向内收敛状态，倾向保守策略');
    if (fateProfile.direction === 'outward') fateInsights.push('向外扩张状态，但需注意是否过于冒进');
    return { actionAdvice, riskLevel, probability: prob.finalProbability, fateInsights };
}

function calculateDirection(cards, fateProfile) {
    let positiveCount = cards.filter(c => c.fortune === '吉').length;
    let direction = positiveCount >= 2 ? '方向正确，继续前进' : positiveCount === 1 ? '方向基本正确，但需要调整' : '方向可能需要重新考虑';
    let fateMod = '', awareMod = '';
    if (fateProfile.energy === 'fear') fateMod = '（内心有恐惧，可能低估了方向的正确性）';
    else if (fateProfile.energy === 'hope') fateMod = '（内心有希望，方向感更清晰）';
    if (fateProfile.awareness === 'unclear') awareMod = '（当前觉知模糊，建议多观察再定方向）';
    else if (fateProfile.awareness === 'clear') awareMod = '（觉知清晰，对方向的判断更可信）';
    let timing = '';
    if (fateProfile.timing === 'rising') timing = '上升期，适合开拓新方向';
    else if (fateProfile.timing === 'stable') timing = '稳定期，巩固现有方向';
    else if (fateProfile.timing === 'declining') timing = '下降期，需要寻找新的出路';
    else if (fateProfile.timing === 'turning') timing = '转折期，方向即将改变';
    return { direction: direction + fateMod + awareMod, timing };
}

// --- 事件类计算：开放式叙事问题（"会怎样/未来/出路/结果"） ---
function calculateEvent(cards, fateProfile) {
    const score = calculateScore(cards, fateProfile);
    const positiveCount = cards.filter(c => c.fortune === '吉').length;
    const negativeCount = cards.filter(c => c.fortune === '凶').length;

    // 整体趋势
    let trend, trendIcon;
    if (score >= 70) { trend = '整体向好，机会大于阻碍'; trendIcon = '📈'; }
    else if (score >= 55) { trend = '趋势偏正，但需主动作为'; trendIcon = '➡️'; }
    else if (score >= 45) { trend = '局势中性，方向尚不明朗'; trendIcon = '↔️'; }
    else if (score >= 30) { trend = '存在阻力，需要调整策略'; trendIcon = '⚠️'; }
    else { trend = '当前阻力较大，需先止损'; trendIcon = '📉'; }

    // 关键变量（影响事件走向的主因）
    const keyFactors = [];
    if (fateProfile.energy === 'fear') keyFactors.push('内心恐惧正在影响行动力');
    else if (fateProfile.energy === 'hope') keyFactors.push('内心驱动力充足，主动性强');
    if (fateProfile.timing === 'turning') keyFactors.push('处于转折期，此刻的选择影响深远');
    else if (fateProfile.timing === 'rising') keyFactors.push('能量上升期，行动时机有利');
    else if (fateProfile.timing === 'declining') keyFactors.push('能量消耗期，需谨慎行事');
    if (fateProfile.awareness === 'unclear') keyFactors.push('觉知模糊，建议先观察清楚再动');
    if (positiveCount === 3) keyFactors.push('三牌全吉，命运能量高度一致');
    if (negativeCount >= 2) keyFactors.push('多张凶牌，需面对并处理障碍');
    if (cards[2].fortune === '吉') keyFactors.push('未来牌为吉，结局倾向积极');
    else if (cards[2].fortune === '凶') keyFactors.push('未来牌为凶，需主动干预改变走向');

    return { trend, trendIcon, score, keyFactors, positiveCount, negativeCount };
}

// --- 问题类型判断 ---
function classifyQuestion(question) {
    // 优先级1：数量类（最高，避免误判为概率）
    if (/多少人|几个|多少位|数量|几位/.test(question)) return 'quantity';
    // 优先级2：时间类
    if (/什么时候|多久|时间|年份|日期|时日/.test(question)) return 'time';
    // 优先级3：概率类
    if (/概率|几率|多大/.test(question)) return 'probability';
    // 优先级4：是否判断（明确的会/是/能/好不好）
    if (/会不会|是否|能否|能不能|会吗|会的吗|行吗/.test(question)) return 'yesno';
    // 优先级5：评估/判断类（好坏、对错、值不值）
    if (/是不是|对不对|好不好|值得|应该|合不合适|靠谱|行得通/.test(question)) return 'judgment';
    // 优先级6：决策/行动类（该怎么做）
    if (/该怎么做|怎么办|如何|怎么|应该怎|如何做/.test(question)) return 'decision';
    // 优先级7：方向/路径类（包含"在哪""出路""路""方向""选择""路口"等）
    if (/方向|选择|走哪|哪条|出路|去哪|路在|未来在哪|该走|往哪|哪个方向/.test(question)) return 'direction';
    // 优先级8：开放式事件类（"会怎样""结果""未来""命运""前景"等叙事性问题）
    if (/会怎样|结果|未来|前景|前途|命运|走向|发展|趋势|下一步|接下来|后续|以后|怎样了|如何了|怎么了|还有救吗|有没有机会|有机会吗/.test(question)) return 'event';
    // 默认：开放式事件类（兜底，不再用 yesno，避免"出路在哪"这类问题拿到"会/不会"答案）
    return 'event';
}

// ==================== 6. AI 调用 ====================
// 精简版哲学框架
function philosophyFrameworkShort() {
    return `
- **二元对立**：恐惧和希望是一体两面，都是驱动力。你的选择是在这两极之间寻找平衡。→ 语境：用户恐惧驱动时，帮切换到希望面
- **玩家心态**：人生如游戏，从被动承受变为主动参与。知道是戏会更投入，因为无需执着。→ 语境：用户深陷困境时，提醒他是玩家不是角色
- **观察者理论**：你永远是你自己的观察者。你选择关注什么，什么就会成为你的现实。→ 语境：用户觉知模糊时，帮切换观察焦点
- **回归婴儿**：不怀疑自己的判断，不消耗能量在纠结上，把能量用来成长。→ 语境：用户反复纠结时，直接说"放下纠结，做就是"
- **渐进式验证**：不需要一次确定答案，先走一步看看，再走一步。→ 语境：用户想一次确认时，告诉他不需现在就确定答案`;
}

// 动态权重
function calculateFateWeight(profile) {
    let weight = 30;
    if (profile.awareness === 'clear') weight += 10;
    else if (profile.awareness === 'unclear') weight -= 15;
    if (profile.timing === 'rising') weight += 5;
    else if (profile.timing === 'declining') weight -= 5;
    if (profile.awareness === 'unclear' && profile.timing === 'declining') weight -= 5;
    if (profile.awareness === 'clear' && profile.timing === 'rising') weight += 5;
    // 反馈校准
    const stats = getFeedbackStats();
    if (stats && stats.lowAccuracyProfiles && stats.lowAccuracyProfiles.length > 0) {
        const currentKey = `${profile.energy || '?'}_${profile.awareness || '?'}_${profile.timing || '?'}`;
        const lowProfile = stats.lowAccuracyProfiles.find(p => p.profile === currentKey);
        if (lowProfile) {
            weight -= 8;
            console.log(`⚠️ 该画像组合历史准确率仅${lowProfile.accuracy}%，自动降低画像权重`);
        }
    }
    return Math.max(15, Math.min(45, weight));
}

function buildTarotPrompt(question, cards, fateProfile, timeCalculation, probabilityCalculation, yesnoCalculation, judgmentCalculation, directionCalculation, questionType, quantityCalculation, eventCalculation) {
    const now = new Date();
    const currentDate = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
    const currentYear = now.getFullYear();

    const cardsText = cards.map(c => `- ${c.position}: ${c.name}（${c.meaning}）`).join('\n');

    // 命运画像 - 详细中文说明
    const energyDesc = {
        'fear': '恐惧驱动（焦虑、害怕失去，行动出于逃避痛苦）',
        'hope': '希望驱动（期待、想要得到，行动出于追求理想）',
        'neutral': '中性（平静、无强烈驱动力）'
    };
    const directionDesc = {
        'inward': '向内收敛（自我保护、收缩、求稳）',
        'outward': '向外扩张（探索、创造、冒险）',
        'balance': '方向平衡（两者兼顾）'
    };
    const relationDesc = {
        'entangled': '深度纠缠（与他人命运紧密交织）',
        'independent': '相对独立（较少受他人影响）',
        'uncertain': '关系不确定（摇摆状态）'
    };
    const timingDesc = {
        'rising': '上升期（能量上升，机会增多）',
        'stable': '稳定期（相对平稳，积蓄力量）',
        'declining': '下降期（能量消耗，需谨慎）',
        'turning': '转折期（即将发生变化，关键时期）'
    };
    const awarenessDesc = {
        'clear': '觉知清晰（对自己和处境有清楚认识）',
        'partial': '觉知部分（有些看清，有些还在迷雾中）',
        'unclear': '觉知模糊（完全看不清局势）'
    };

    const energyVal = fateProfile.energy || '未知';
    const directionVal = fateProfile.direction || '未知';
    const relationVal = fateProfile.relation || '未知';
    const timingVal = fateProfile.timing || '未知';
    const awarenessVal = fateProfile.awareness || '未知';

    const fateText = `能量驱动: ${energyDesc[energyVal] || energyVal}
方向倾向: ${directionDesc[directionVal] || directionVal}
关系状态: ${relationDesc[relationVal] || relationVal}
时间阶段: ${timingDesc[timingVal] || timingVal}
觉知程度: ${awarenessDesc[awarenessVal] || awarenessVal}`;

    // 构建前端计算数据
    let extraInfo = `问题类型: ${questionType}`;
    if (timeCalculation) extraInfo += `\n预计时间: ${timeCalculation.finalTime}（基于牌面时间暗示+命运画像修正）`;
    if (probabilityCalculation) extraInfo += `\n成功概率: ${probabilityCalculation.finalProbability}%（基于牌面吉凶+命运画像修正）`;
    if (yesnoCalculation) extraInfo += `\n是否判断: ${yesnoCalculation.answer}（置信度${yesnoCalculation.probability}%）`;
    if (judgmentCalculation) extraInfo += `\n判断: ${judgmentCalculation.judgment}（概率${judgmentCalculation.probability}%）`;
    if (directionCalculation) extraInfo += `\n方向: ${directionCalculation.direction}\n时机: ${directionCalculation.timing}`;
    if (quantityCalculation) extraInfo += `\n数量估测: ${quantityCalculation.countText}（等级: ${quantityCalculation.level}，原始分值${quantityCalculation.rawScore}）`;
    if (eventCalculation) extraInfo += `\n整体趋势: ${eventCalculation.trend}（分值${eventCalculation.score}）\n关键变量: ${eventCalculation.keyFactors.join('；')}`;

    // === 第一步：最高优先级系统指令 ===
    const systemInstruction = `你是"命运塔罗"占卜师。你的核心任务是：**直接回答用户的问题**，并引用前端提供的精确数据进行解释。

# 🚨 你的回答必须遵循以下优先级（按顺序执行）：
1. **直接回答**：
   - 如果是时间问题，第一行直接给时间段，如 "**2027年**"。
   - 如果是数量问题（多少人），第一行直接给估测范围，如 "**3-5人**" 或 "**桃花旺盛**"，**绝对不要给百分比**。
   - 如果是概率问题，第一行给百分比，如 "**65%**"。
   - 如果是是否问题，第一行给 "**会**" 或 "**不会**"。
   - 如果是事件/叙事类问题（出路、未来、结果、命运、前景等），第一行给整体趋势判断，如 "**整体向好，机会大于阻碍**"，然后具体描述事件走向和出路。
2. **引用数据**：紧接着用一两句话解释，这个答案来自前端计算（牌面70% + 命运画像30%）。
3. **哲学解读**：之后，你才可以用下面提供的哲学概念来分析"为什么"，给用户提供深度。

# ⚠️ 绝对禁止：
- 用户问"多少人"时，禁止回答"60%的概率"，必须转化为"少数人"或"很多人"这种自然语言。
- 用户问"出路在哪/未来怎样/结果如何"时，禁止回答"会"或"不会"，必须给出叙事性的趋势判断和具体方向。
- 第一行不要写"根据牌面显示"、"前端计算结果是"等铺垫，直接给答案！
- 不能自己编造数字、修改前端计算的结果。
- 不能在回答中表现出犹豫，比如"可能"、"或许"。
- 不能只写哲学分析而忘记回答用户的具体问题。
- 不能把"探索"、"面对"、"拥抱"等文艺化动词当万能药。

# 当前日期
今天是${currentDate}，所有时间计算都基于此日期。`;

    // === 第二步：组装完整 prompt ===
    let fullPrompt = systemInstruction + '\n\n' + '='.repeat(40) + '\n\n';
    // 动态权重
    const fateWeight = calculateFateWeight(fateProfile);
    const cardWeight = 100 - fateWeight;
    fullPrompt += `# 前端数据（你的解读依据）\n${extraInfo}\n\n`;
    const weightExplain = fateWeight <= 20 ? '因为你觉知模糊，画像参考价值较低，更多依据牌面。' : fateWeight >= 40 ? '因为你觉知清晰，命运画像的参考价值较高。' : '牌面和画像权重均衡。';
    fullPrompt += `# 权重说明\n本次解读中，牌面占${cardWeight}%，命运画像占${fateWeight}%。${weightExplain}\n\n`;
    fullPrompt += `# 用户命运画像\n${fateText}\n\n`;
    fullPrompt += `# 抽到的塔罗牌\n${cardsText}\n\n`;
    fullPrompt += `# 用户的具体问题\n${question}\n\n`;
    if (fateProfile.openConcern) {
        fullPrompt += `# 用户当前困扰\n${fateProfile.openConcern}\n\n`;
    }
    // 🔗 核心洞察：共振/冲突机制
    const relations = analyzeCardProfileRelation(cards, fateProfile);
    if (relations.length > 0) {
        fullPrompt += `# 🧬 核心洞察（画像与牌面的化学反应）\n`;
        fullPrompt += `以下是你必须融入解读的"画像-牌面"关系判断（这不是建议，是约束）：\n`;
        relations.forEach(r => {
            fullPrompt += `- ${r.text}\n`;
        });
        fullPrompt += `\n⚠️ 以上洞察必须体现在你的解读中，不能忽略！\n\n`;
    }

    // 🔗 三牌因果链条 → 英雄之旅故事
    fullPrompt += `# 🔗 英雄之旅（三牌因果链）\n`;
    fullPrompt += `请基于这三张牌，为用户写一个微型的"英雄之旅"故事，而不是机械地解释牌义：\n\n`;
    fullPrompt += `**起因（过去）**：用户因为[画像特征：${energyDesc[energyVal] || energyVal}]，种下了[${cards[0].name}]的因。这个因的本质是什么？\n\n`;
    fullPrompt += `**现状（现在）**：这个因在[画像特征]的催化下，演变成了[${cards[1].name}]的局面。用户此刻正面临什么？${relations.length > 0 ? '注意：' + relations[0].type + '效应正在发生！' : ''}\n\n`;
    fullPrompt += `**结局（未来）**：如果用户不改变[画像中的弱点]，未来将不可避免地走向[${cards[2].name}]；但如果利用[画像中的优势]，可以将[${cards[2].name}]转化为[积极面]。\n\n`;
    fullPrompt += `1. 过去牌中的什么经历，直接导致了现在牌的局面？\n2. 现在牌中的哪种互动模式，正在把用户推向未来牌的方向？\n3. 如果用户想改变命运走向，应该从哪一环开始改变？\n\n`;

    fullPrompt += `# 你的任务：按照"直接回答 -> 引用数据 -> 核心洞察 -> 英雄之旅 -> 哲学解读"的流程，为用户提供一次有洞察力的塔罗解读。`;
    fullPrompt += `\n\n# 哲学分析框架（可选，用于第三步"哲学解读"）\n` + philosophyFrameworkShort();

    // 强制输出格式
    if (questionType === 'time') {
        fullPrompt += `\n\n输出格式：第一行写 "**${timeCalculation.finalTime}**"，第二行解释这个时间的计算依据，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'probability') {
        fullPrompt += `\n\n输出格式：第一行写 "**${probabilityCalculation.finalProbability}%**"，第二行解释概率的构成，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'yesno') {
        fullPrompt += `\n\n输出格式：第一行直接写一个词 "**${yesnoCalculation.answer}**"（加粗），第二行解释为什么，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'judgment') {
        fullPrompt += `\n\n输出格式：第一行写 "**${judgmentCalculation.judgment}**"（加粗），第二行解释判断依据，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'decision') {
        const dc = calculateDecision(cards, fateProfile);
        fullPrompt += `\n\n输出格式：第一行写 "**${dc.actionAdvice}**"（加粗），第二行解释建议和风险等级，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'direction') {
        fullPrompt += `\n\n输出格式：第一行写 "**${directionCalculation.direction}**"，第二行解释方向判断依据，然后是核心洞察（如有），然后是英雄之旅分析，最后是哲学解读。`;
    } else if (questionType === 'quantity') {
        fullPrompt += `\n\n# 用户意图：数量估测
用户想知道具体的数量或规模，不是概率百分比！
前端计算结果：${quantityCalculation.countText}（等级: ${quantityCalculation.level}，原始分值${quantityCalculation.rawScore}）。

输出格式：
1. 第一行直接写结论，例如 "**${quantityCalculation.countText}**" 或 "**${quantityCalculation.level}**"（加粗）。
2. 第二行解释：结合牌面（如恋人牌代表1对，星星牌代表多）和画像，解释为什么是这个数量。
3. 接着进行核心洞察（如有）、英雄之旅和哲学解读。`;
    } else if (questionType === 'event') {
        fullPrompt += `\n\n# 用户意图：事件叙事类（开放式问题）
用户问的是一个开放性的事件走向、结果或出路，需要给出叙事性的趋势分析，而不是"会/不会"这样的判断！
前端计算结果：
- 整体趋势：${eventCalculation.trend}（${eventCalculation.trendIcon}）
- 能量分值：${eventCalculation.score}分（100分制）
- 关键变量：${eventCalculation.keyFactors.join('；')}
- 三牌吉凶：吉${eventCalculation.positiveCount}张 / 凶${eventCalculation.negativeCount}张

输出格式：
1. 第一行直接写趋势结论，例如 "**${eventCalculation.trendIcon} ${eventCalculation.trend}**"（加粗）。
2. 第二行：用1-2句话解释趋势来自哪（牌面吉凶 + 命运画像）。
3. 第三段：结合用户的具体问题（"${question}"），给出**具体的方向描述**——出路在哪？接下来应该注意什么？哪件事最关键？
4. 接着进行核心洞察（如有）、英雄之旅分析。
5. 最后是哲学解读（简洁）。

⚠️ 切记：用户问的是"${question}"，必须针对这个问题给出具体可操作的洞见，而不是泛泛而谈。`;
    }

    return fullPrompt;
}

// --- AI 请求 ---
async function getAIReading() {
    showStep(4);
    const questionType = classifyQuestion(userQuestion);

    let timeCalculation, probabilityCalculation, yesnoCalculation, judgmentCalculation, decisionCalculation, directionCalculation, quantityCalculation, eventCalculation;
    const cards = selectedCards.map((card, i) => ({
        ...card,
        position: i === 0 ? '过去' : i === 1 ? '现在' : '未来'
    }));

    if (questionType === 'time') {
        timeCalculation = calculateTime(cards, fateProfile);
    } else if (questionType === 'probability') {
        probabilityCalculation = calculateProbability(cards, fateProfile);
    } else if (questionType === 'yesno') {
        yesnoCalculation = calculateYesNo(cards, fateProfile);
    } else if (questionType === 'judgment') {
        judgmentCalculation = calculateJudgment(cards, fateProfile);
    } else if (questionType === 'decision') {
        decisionCalculation = calculateDecision(cards, fateProfile);
    } else if (questionType === 'direction') {
        directionCalculation = calculateDirection(cards, fateProfile);
    } else if (questionType === 'quantity') {
        quantityCalculation = calculateQuantity(cards, fateProfile);
    } else if (questionType === 'event') {
        eventCalculation = calculateEvent(cards, fateProfile);
    }

    const prompt = buildTarotPrompt(userQuestion, cards, fateProfile, timeCalculation, probabilityCalculation, yesnoCalculation, judgmentCalculation, directionCalculation, questionType, quantityCalculation, eventCalculation);

    try {
        const reading = await callAI(prompt);
        displayReading(reading, timeCalculation, probabilityCalculation, yesnoCalculation, judgmentCalculation, decisionCalculation, directionCalculation, questionType, quantityCalculation, eventCalculation);
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
    const timeoutMs = 300000; // 5分钟
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(BUILT_IN_API.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BUILT_IN_API.key}`
                },
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
                const errLabel = error.name === 'AbortError' ? '请求超时（5分钟无响应）' : '网络错误';
                console.warn(`${errLabel}，${waitMs/1000}s后重试(${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟无响应）。可能原因：①API余额不足 ②网络不稳定 ③prompt过长。建议切换到GLM-4-Flash（免费）重试。');
            }
            throw error;
        }
    }
}

// ==================== 7. 结果展示 ====================
function displayReading(reading, timeCalculation, probabilityCalculation, yesnoCalculation, judgmentCalculation, decisionCalculation, directionCalculation, questionType, quantityCalculation, eventCalculation) {
    document.getElementById('readingLoading').classList.add('hidden');
    document.getElementById('readingContent').classList.remove('hidden');

    const resultDiv = document.getElementById('readingResult');
    let html = '';

    // 显示权重信息
    const fateW = calculateFateWeight(fateProfile);
    const cardW = 100 - fateW;
    const feedbackNote = (() => {
        const stats = getFeedbackStats();
        if (!stats || !stats.lowAccuracyProfiles || stats.lowAccuracyProfiles.length === 0) return '';
        const key = `${fateProfile.energy || '?'}_${fateProfile.awareness || '?'}_${fateProfile.timing || '?'}`;
        const low = stats.lowAccuracyProfiles.find(p => p.profile === key);
        if (low) return ` · 历史准确率${low.accuracy}%，已自动降低画像权重`;
        return '';
    })();
    html += `<div style="text-align:center;font-size:0.8em;color:#7f8c8d;margin-bottom:12px;">牌面 ${cardW}% | 命运画像 ${fateW}%${fateW <= 20 ? ' · 觉知模糊，更多依据牌面' : fateW >= 40 ? ' · 觉知清晰，画像参考价值高' : ''}${feedbackNote}</div>`;

    if (questionType === 'time' && timeCalculation) {
        html += `<div class="reading-section"><h3>⏰ 预计时间</h3><p class="time-range">${timeCalculation.finalTime}</p></div>`;
    }
    if (questionType === 'probability' && probabilityCalculation) {
        html += `<div class="reading-section"><h3>📊 成功概率</h3><p class="probability">${probabilityCalculation.finalProbability}%</p></div>`;
    }
    if (questionType === 'yesno' && yesnoCalculation) {
        const answerClass = yesnoCalculation.answer === '会' ? 'yes' : 'no';
        html += `<div class="reading-section"><h3>🎯 答案</h3><p class="answer ${answerClass}">${yesnoCalculation.answer}</p></div>`;
    }
    if (questionType === 'judgment' && judgmentCalculation) {
        const jClass = judgmentCalculation.judgment.includes('是') && !judgmentCalculation.judgment.includes('不是') ? 'yes' : 'no';
        html += `<div class="reading-section"><h3>⚖️ 判断</h3><p class="answer ${jClass}">${judgmentCalculation.judgment}（${judgmentCalculation.probability}%）</p></div>`;
    }
    if (questionType === 'decision' && decisionCalculation) {
        const riskColors = { '低风险': '#2ecc71', '中低风险': '#f39c12', '中等风险': '#e67e22', '中高风险': '#e74c3c', '高风险': '#c0392b' };
        html += `<div class="reading-section"><h3>🧭 行动建议</h3><p style="font-size:1.3em;color:${riskColors[decisionCalculation.riskLevel] || '#fff'}">${decisionCalculation.actionAdvice}</p><p style="color:#bdc3c7;margin-top:5px">风险等级：${decisionCalculation.riskLevel} | 有利概率：${decisionCalculation.probability}%</p></div>`;
    }
    if (questionType === 'direction' && directionCalculation) {
        html += `<div class="reading-section"><h3>🧭 方向判断</h3><p style="font-size:1.2em">${directionCalculation.direction}</p><p style="color:#bdc3c7;margin-top:5px">${directionCalculation.timing}</p></div>`;
    }
    if (questionType === 'quantity' && quantityCalculation) {
        const qtyLevelColors = { '桃花旺盛': '#2ecc71', '桃花渐开': '#f39c12', '暗藏玄机': '#9b59b6', '需要等待': '#7f8c8d', '需要主动': '#e67e22', '蓄势待发': '#3498db' };
        const qtyColor = qtyLevelColors[quantityCalculation.level.replace('↑', '')] || '#a78bfa';
        html += `<div class="reading-section" style="border-left-color:${qtyColor};">
            <h3>👥 数量估测</h3>
            <p style="font-size:1.4em;color:${qtyColor};font-weight:bold;">
                ${quantityCalculation.countText}
            </p>
            <p style="font-size:1.1em;color:#ddd;margin-top:4px;">
                ${quantityCalculation.level}
            </p>
            <p style="color:#888;margin-top:5px;font-size:0.85em;">
                (基于牌面能量场与你的个人画像推算，原始分值 ${quantityCalculation.rawScore})
            </p>
        </div>`;
    }
    if (questionType === 'event' && eventCalculation) {
        const trendColors = { '📈': '#2ecc71', '➡️': '#f39c12', '↔️': '#bdc3c7', '⚠️': '#e67e22', '📉': '#e74c3c' };
        const trendColor = trendColors[eventCalculation.trendIcon] || '#a78bfa';
        html += `<div class="reading-section" style="border-left-color:${trendColor};">
            <h3>🔮 事件走向</h3>
            <p style="font-size:1.4em;color:${trendColor};font-weight:bold;">
                ${eventCalculation.trendIcon} ${eventCalculation.trend}
            </p>
            <p style="color:#bdc3c7;margin-top:6px;font-size:0.9em;">
                能量分值 ${eventCalculation.score}/100 · 吉牌${eventCalculation.positiveCount}张 / 凶牌${eventCalculation.negativeCount}张
            </p>
            ${eventCalculation.keyFactors.length > 0 ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;">
                <div style="font-size:0.8em;color:#888;margin-bottom:4px;">关键变量</div>
                ${eventCalculation.keyFactors.map(f => `<div style="font-size:0.9em;color:#bdc3c7;margin:2px 0;">· ${f}</div>`).join('')}
            </div>` : ''}
        </div>`;
    }

    // 共振/冲突提示
    const cards = selectedCards.map((card, i) => ({...card, position: i === 0 ? '过去' : i === 1 ? '现在' : '未来'}));
    const relations = analyzeCardProfileRelation(cards, fateProfile);
    if (relations.length > 0) {
        html += `<div class="reading-section" style="border-left-color:#9b59b6;"><h3>🧬 核心洞察</h3>`;
        relations.forEach(r => {
            const levelColor = r.level === 'danger' ? '#e74c3c' : r.level === 'warning' ? '#f39c12' : '#2ecc71';
            const levelIcon = r.level === 'danger' ? '⚡' : r.level === 'warning' ? '⚠️' : '✨';
            html += `<p style="color:${levelColor};margin-bottom:8px;">${levelIcon} ${r.text}</p>`;
        });
        html += `</div>`;
    }

    html += `<div class="reading-section"><h3>✨ 详细解读</h3><p>${reading.replace(/\n/g, '<br>')}</p></div>`;

    // 幸运物/色 + 行动指南
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

    // 用户自评反馈
    const readingId = Date.now().toString(36);
    html += `<div id="feedback-section" style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;text-align:center;">
        <p style="color:#bdc3c7;margin-bottom:12px;">这个分析对你有帮助吗？</p>
        <button onclick="submitFeedback('${readingId}', 'helpful')" style="margin:0 6px;padding:8px 20px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:8px;color:#2ecc71;cursor:pointer;font-size:14px;">👍 有帮助</button>
        <button onclick="submitFeedback('${readingId}', 'neutral')" style="margin:0 6px;padding:8px 20px;background:rgba(241,196,15,0.15);border:1px solid rgba(241,196,15,0.3);border-radius:8px;color:#f1c40f;cursor:pointer;font-size:14px;">😐 一般</button>
        <button onclick="submitFeedback('${readingId}', 'unhelpful')" style="margin:0 6px;padding:8px 20px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3);border-radius:8px;color:#e74c3c;cursor:pointer;font-size:14px;">👎 不准</button>
    </div>`;

    resultDiv.innerHTML = html;
    document.getElementById('readingContent').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 保存到历史记录
    saveReadingHistory(reading, questionType, cards, relations);
}

// ==================== 8. 工具函数 ====================
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

// --- 保存海报（html2canvas 截图） ---
async function saveAsImage() {
    const resultDiv = document.getElementById('readingResult');
    const btn = document.getElementById('savePoster');
    
    if (!resultDiv) return;

    // 按钮状态
    const originalText = btn.innerHTML;
    btn.innerHTML = '🎨 生成中...';
    btn.disabled = true;

    try {
        // 使用 html2canvas 截图
        const canvas = await html2canvas(resultDiv, {
            backgroundColor: '#1a1a2e', // 深色背景，防止透明变黑
            scale: 2, // 2倍清晰度
            useCORS: true, // 允许跨域图片
            logging: false
        });

        // 转换为图片并下载
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `命运塔罗解读_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
        link.click();

    } catch (err) {
        console.error('海报生成失败:', err);
        // 回退方案：复制文本
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

// --- 导出/导入存档 ---
function exportProfile() {
    const data = {
        fateProfile: fateProfile,
        feedbacks: JSON.parse(localStorage.getItem('tarot_feedbacks') || '[]'),
        exportTime: new Date().toISOString()
    };
    const str = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.cssText = 'position:fixed;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('✓ 存档已复制到剪贴板！\n粘贴到任何地方即可保存，下次点"导入存档"粘贴回来即可恢复。');
}

function importProfile() {
    const str = prompt('请粘贴之前导出的存档字符串：');
    if (!str || !str.trim()) return;
    try {
        const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
        if (data.fateProfile) {
            fateProfile = data.fateProfile;
            localStorage.setItem('tarot_fate_profile', JSON.stringify(fateProfile));
        }
        if (data.feedbacks) {
            localStorage.setItem('tarot_feedbacks', JSON.stringify(data.feedbacks));
        }
        displayFateProfile();
        updateAtmosphere(fateProfile);
        Object.keys(fateProfile).forEach(question => {
            const optionsContainer = document.querySelector(`[data-question="${question}"]`);
            if (optionsContainer) {
                optionsContainer.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                const option = optionsContainer.querySelector(`[data-value="${fateProfile[question]}"]`);
                if (option) option.classList.add('selected');
            }
        });
        const concern = document.getElementById('openConcern');
        if (concern && fateProfile.openConcern) concern.value = fateProfile.openConcern;
        const nextBtn = document.getElementById('nextToQuestion');
        if (nextBtn) nextBtn.disabled = false;
        alert('✓ 存档导入成功！');
    } catch(e) {
        alert('存档格式错误，请检查是否复制完整。');
    }
}

// --- 命运画像视觉反馈 ---
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
    if (profile.awareness === 'unclear') {
        tipText = tipText || '🌊 迷雾中的你，让塔罗照亮一条路';
    } else if (profile.awareness === 'clear') {
        if (!tipText) tipText = '🔮 你的直觉很准，塔罗会印证你的判断';
    }

    overlay.style.background = bgColor;
    if (tipText) {
        tip.textContent = tipText;
        tip.classList.add('show');
        setTimeout(() => tip.classList.remove('show'), 4000);
    }
}

// --- 冥想引导（3秒倒计时 + 呼吸动画 + 文案渐变） ---
function startMeditation(callback) {
    const overlay = document.getElementById('meditation-overlay');
    const textEl = document.getElementById('meditationText');
    const countdownEl = document.getElementById('meditationCountdown');
    if (!overlay) { callback(); return; }

    overlay.classList.add('active');
    const messages = [
        '请闭上眼睛，默念你的问题...',
        '感受能量的流动...',
        '让塔罗感应你的命运...'
    ];
    let step = 0;
    let remaining = 4;

    function showNext() {
        if (step < messages.length) {
            textEl.classList.remove('visible');
            setTimeout(() => {
                textEl.textContent = messages[step];
                textEl.classList.add('visible');
                step++;
            }, 300);
        }
    }

    // 初始显示
    setTimeout(() => textEl.classList.add('visible'), 100);
    setTimeout(showNext, 1200);
    setTimeout(showNext, 2600);

    // 倒计时
    const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            countdownEl.textContent = remaining + '秒后抽牌...';
        } else {
            clearInterval(countdownInterval);
        }
    }, 1000);
    countdownEl.textContent = remaining + '秒后抽牌...';

    // 3.5秒后结束冥想
    setTimeout(() => {
        overlay.classList.remove('active');
        textEl.classList.remove('visible');
        countdownEl.textContent = '';
        callback();
    }, 3800);
}

// --- 牌面氛围特效（根据抽到的牌动态切换背景） ---
function updateCardAtmosphere(cards) {
    const atm = document.getElementById('card-atmosphere');
    if (!atm) return;

    // 清除所有类
    atm.className = '';
    atm.id = 'card-atmosphere';

    const mainCard = cards[1]; // 现在牌决定氛围
    const hasNegative = cards.some(c => c.fortune === '凶');
    const hasPositive = cards.some(c => c.fortune === '吉');

    // 月亮/恶魔 → 模糊+噪点
    if (mainCard.element === '月亮' || mainCard.element === '恶魔') {
        atm.classList.add('fog', 'noise');
    }
    // 塔/死神 → 黑暗压迫
    else if (mainCard.element === '塔' || mainCard.element === '死神') {
        atm.classList.add('dark');
    }
    // 太阳/星星 → 光晕扩散
    else if (mainCard.element === '太阳' || mainCard.element === '星星') {
        atm.classList.add('glow');
    }
    // 全凶 → 黑暗
    else if (hasNegative && !hasPositive) {
        atm.classList.add('dark');
    }
    // 全吉 → 光晕
    else if (hasPositive && !hasNegative) {
        atm.classList.add('glow');
    }
}

// --- 用户自评反馈系统 ---
function submitFeedback(readingId, feedback) {
    const feedbacks = JSON.parse(localStorage.getItem('tarot_feedbacks') || '[]');
    feedbacks.push({
        id: readingId,
        feedback: feedback,
        fateProfile: {...fateProfile},
        question: userQuestion,
        cards: selectedCards.map(c => c.name),
        timestamp: Date.now()
    });
    localStorage.setItem('tarot_feedbacks', JSON.stringify(feedbacks));

    // 视觉反馈
    const section = document.getElementById('feedback-section');
    if (section) {
        const labels = { helpful: '👍 感谢反馈！', neutral: '😐 收到，会继续改进', unhelpful: '👎 感谢诚实反馈，会优化权重' };
        section.innerHTML = `<p style="color:${feedback === 'helpful' ? '#2ecc71' : feedback === 'unhelpful' ? '#e74c3c' : '#f1c40f'};font-size:1.1em;">${labels[feedback]}</p>`;
    }
}

// 获取反馈统计
function getFeedbackStats() {
    const feedbacks = JSON.parse(localStorage.getItem('tarot_feedbacks') || '[]');
    if (feedbacks.length === 0) return null;

    const stats = { helpful: 0, neutral: 0, unhelpful: 0, total: feedbacks.length };
    const profileAccuracy = {};

    feedbacks.forEach(f => {
        stats[f.feedback]++;
        const key = `${f.fateProfile.energy || '?'}_${f.fateProfile.awareness || '?'}_${f.fateProfile.timing || '?'}`;
        if (!profileAccuracy[key]) profileAccuracy[key] = { helpful: 0, total: 0 };
        profileAccuracy[key].total++;
        if (f.feedback === 'helpful') profileAccuracy[key].helpful++;
    });

    const lowAccuracy = Object.entries(profileAccuracy)
        .filter(([_, v]) => v.total >= 3 && v.helpful / v.total < 0.4)
        .map(([k, v]) => ({ profile: k, accuracy: Math.round(v.helpful / v.total * 100), samples: v.total }));

    return { ...stats, lowAccuracyProfiles: lowAccuracy };
}

// ==================== 9. 历史记录 ====================
function saveReadingHistory(reading, questionType, cards, relations) {
    const history = JSON.parse(localStorage.getItem('tarot_history') || '[]');
    history.unshift({
        id: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        question: userQuestion,
        questionType,
        cards: cards.map(c => ({ name: c.name, element: c.element, fortune: c.fortune, position: c.position })),
        relations: relations.map(r => ({ type: r.type, level: r.level, text: r.text })),
        profile: { ...fateProfile },
        reading: reading.substring(0, 500), // 截取前500字节省空间
        lucky: getLuckyElement(cards)
    });
    // 最多保存20条
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
            const cardsStr = h.cards.map(c => `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:4px;background:${c.fortune === '凶' ? 'rgba(231,76,60,0.15)' : c.fortune === '吉' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.05)'};color:${c.fortune === '凶' ? '#e74c3c' : c.fortune === '吉' ? '#2ecc71' : '#bdc3c7'};font-size:0.8em;">${c.position}: ${c.name}</span>`).join('');
            const relationIcons = h.relations ? h.relations.map(r => r.level === 'danger' ? '⚡' : r.level === 'warning' ? '⚠️' : '✨').join('') : '';
            html += `<div style="padding:12px 16px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${h.lucky ? h.lucky.colorHex : '#f39c12'};cursor:pointer;" onclick="toggleHistoryDetail(${i})">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.85em;color:#7f8c8d;">${h.date}</div>
                    <div>${relationIcons}</div>
                </div>
                <div style="margin-top:4px;font-size:0.95em;">${h.question}</div>
                <div style="margin-top:6px;">${cardsStr}</div>
                <div id="history-detail-${i}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);font-size:0.85em;color:#bdc3c7;max-height:200px;overflow-y:auto;">
                    ${h.reading ? h.reading.replace(/\n/g, '<br>') : ''}
                </div>
            </div>`;
        });
    }

    // 弹窗显示
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