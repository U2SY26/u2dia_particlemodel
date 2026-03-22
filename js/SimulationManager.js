/**
 * SimulationManager
 * Handles simulation card CRUD, sidebar UI, physics parameter binding,
 * AI chat interface, and server communication.
 */
import { tPreset } from './i18n.js';

const API_BASE = '';  // Same origin

// Default physics template
const BASE_PHYSICS = {
    gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000,
    timeScale: 1.0, friction: 0.8, bounciness: 0.3,
    windX: 0, windY: 0, windZ: 0, turbulence: 0,
    viscosity: 0, temperature: 293,
    foundation: 5.0, density: 2.4, elasticity: 0.3, yieldStrength: 50,
    seismic: 0, seismicFreq: 2.0, snowLoad: 0, floodLevel: 0,
};

const p = (overrides) => ({ ...BASE_PHYSICS, ...overrides });

// Default physics presets for quick card creation
const PRESETS = [
    // ========== BUILDINGS ==========
    { name: '1층 주택',         prompt: 'house',                tags: ['building', '1F'],     physics: p({ springStiffness: 18, foundation: 4 }) },
    { name: '2층 건물',         prompt: '2층 건물',              tags: ['building', '2F'],     physics: p({ springStiffness: 20, foundation: 5 }) },
    { name: '3층 건물',         prompt: '3층 건물',              tags: ['building', '3F'],     physics: p({ springStiffness: 22, foundation: 5 }) },
    { name: '5층 아파트',       prompt: '5층 건물',              tags: ['building', '5F'],     physics: p({ springStiffness: 25, foundation: 6 }) },
    { name: '10층 오피스',      prompt: '10층 건물',             tags: ['building', '10F'],    physics: p({ springStiffness: 30, foundation: 7 }) },
    { name: '20층 타워',        prompt: '20층 건물',             tags: ['building', 'high'],   physics: p({ springStiffness: 40, foundation: 8, density: 2.5 }) },
    { name: '강철 고층빌딩',     prompt: 'tall skyscraper',       tags: ['building', 'steel'],  physics: p({ springStiffness: 60, foundation: 9, density: 7.8, yieldStrength: 90, elasticity: 0.2 }) },
    { name: '목조 주택',        prompt: 'small house',           tags: ['building', 'wood'],   physics: p({ springStiffness: 12, foundation: 3, density: 0.6, yieldStrength: 20, elasticity: 0.5 }) },
    { name: '콘크리트 건물',     prompt: '5층 건물',              tags: ['building', 'concrete'], physics: p({ springStiffness: 35, foundation: 7, density: 2.4, yieldStrength: 45, elasticity: 0.15 }) },
    { name: '유리 건물',        prompt: '10층 건물',             tags: ['building', 'glass'],  physics: p({ springStiffness: 15, foundation: 6, density: 2.5, yieldStrength: 15, elasticity: 0.1 }) },
    { name: '지진 내진 건물',    prompt: '5층 건물',              tags: ['building', 'seismic'], physics: p({ springStiffness: 45, foundation: 9, seismic: 5, seismicFreq: 3.0, elasticity: 0.4 }) },
    { name: '약한 기초 건물',    prompt: '3층 건물',              tags: ['building', 'weak'],   physics: p({ springStiffness: 10, foundation: 1.5, density: 2.4, yieldStrength: 20 }) },

    // ========== BRIDGES ==========
    { name: '소형 인도교',       prompt: 'small bridge',          tags: ['bridge', 'small'],    physics: p({ springStiffness: 20, foundation: 4, density: 2.0 }) },
    { name: '중형 다리',        prompt: 'bridge',                tags: ['bridge', 'medium'],   physics: p({ springStiffness: 30, foundation: 6, density: 2.4 }) },
    { name: '대형 현수교',       prompt: 'large bridge',          tags: ['bridge', 'large'],    physics: p({ springStiffness: 40, foundation: 8, density: 7.8 }) },
    { name: '강풍 다리',        prompt: 'wide bridge',           tags: ['bridge', 'wind'],     physics: p({ springStiffness: 25, windX: 10, windZ: 3, turbulence: 4, foundation: 6 }) },
    { name: '강철 트러스교',     prompt: 'large bridge',          tags: ['bridge', 'steel'],    physics: p({ springStiffness: 55, foundation: 9, density: 7.8, yieldStrength: 85 }) },
    { name: '목재 다리',        prompt: 'small bridge',          tags: ['bridge', 'wood'],     physics: p({ springStiffness: 10, foundation: 3, density: 0.5, yieldStrength: 15, elasticity: 0.6 }) },
    { name: '지진 다리 테스트',  prompt: 'bridge',                tags: ['bridge', 'seismic'],  physics: p({ springStiffness: 30, seismic: 6, seismicFreq: 2.5, foundation: 7 }) },
    { name: '적설 다리',        prompt: 'bridge',                tags: ['bridge', 'snow'],     physics: p({ springStiffness: 28, snowLoad: 5, foundation: 6 }) },
    { name: '홍수 다리',        prompt: 'bridge',                tags: ['bridge', 'flood'],    physics: p({ springStiffness: 30, floodLevel: 4, viscosity: 1.5, foundation: 6 }) },
    { name: '약한 기초 다리',    prompt: 'bridge',                tags: ['bridge', 'weak'],     physics: p({ springStiffness: 15, foundation: 1.0, yieldStrength: 15 }) },

    // ========== TOWERS ==========
    { name: '전망 타워',        prompt: 'tall tower',            tags: ['tower', 'tall'],      physics: p({ springStiffness: 35, foundation: 7 }) },
    { name: '강풍 타워',        prompt: 'tower',                 tags: ['tower', 'wind'],      physics: p({ springStiffness: 15, windX: 12, windY: 3, windZ: -5, turbulence: 5 }) },
    { name: '지진 타워',        prompt: 'tower',                 tags: ['tower', 'seismic'],   physics: p({ springStiffness: 25, seismic: 7, seismicFreq: 4.0 }) },

    // ========== SPECIAL STRUCTURES ==========
    { name: '고딕 성당',        prompt: 'gothic cathedral',      tags: ['cathedral', 'gothic'], physics: p({ springStiffness: 25, foundation: 7, density: 2.6 }) },
    { name: '고전 사원',        prompt: 'classical temple',      tags: ['temple', 'classical'], physics: p({ springStiffness: 30, foundation: 8, density: 2.7 }) },
    { name: '미니어처 성',       prompt: 'small castle',          tags: ['castle', 'mini'],     physics: p({ springStiffness: 35, foundation: 8, particleCount: 15000 }) },
    { name: '거대 피라미드',     prompt: 'huge pyramid',          tags: ['pyramid', 'huge'],    physics: p({ springStiffness: 50, foundation: 10, density: 2.3, yieldStrength: 80 }) },
    { name: '경기장',           prompt: 'stadium',               tags: ['stadium', 'large'],   physics: p({ springStiffness: 22 }) },
    { name: '대형 돔',          prompt: 'large dome',            tags: ['dome', 'large'],      physics: p({ springStiffness: 28, foundation: 6 }) },
    { name: '아치 게이트',       prompt: '3 arch',               tags: ['arch', 'gate'],       physics: p({ springStiffness: 22 }) },
    { name: '성벽',             prompt: 'wide wall',             tags: ['wall', 'defense'],    physics: p({ springStiffness: 35, foundation: 8, density: 2.5 }) },

    // ========== EXPERIMENTS ==========
    { name: '무중력 파티클',     prompt: 'sphere',                tags: ['zero-g', 'experiment'], physics: p({ gravity: 0, damping: 0.99, springStiffness: 5, bounciness: 0.9, friction: 0.1 }) },
    { name: '강한 중력',        prompt: 'cube',                  tags: ['gravity', 'heavy'],   physics: p({ gravity: -25, springStiffness: 8, bounciness: 0.1 }) },
    { name: '역중력',           prompt: 'pyramid',               tags: ['anti-gravity'],        physics: p({ gravity: 5, damping: 0.95, springStiffness: 10 }) },
    { name: '탄성 구조',        prompt: 'dome',                  tags: ['elastic', 'bouncy'],  physics: p({ springStiffness: 8, bounciness: 0.85, elasticity: 0.8, damping: 0.98, friction: 0.4 }) },
    { name: '점성 유체',        prompt: 'sphere',                tags: ['fluid', 'viscous'],   physics: p({ gravity: -4.0, damping: 0.85, springStiffness: 3, viscosity: 4.0, friction: 0.95, bounciness: 0.05, temperature: 350 }) },
    { name: '고온 플라즈마',     prompt: 'sphere',                tags: ['plasma', 'hot'],      physics: p({ gravity: 0.5, damping: 0.90, springStiffness: 2, particleCount: 30000, bounciness: 0.7, friction: 0.1, windY: 5, viscosity: 0.2, temperature: 4500 }) },
    { name: '극저온 동결',       prompt: 'cube',                  tags: ['cryo', 'frozen'],     physics: p({ temperature: 5, damping: 0.999, springStiffness: 50, friction: 0.99, bounciness: 0.01 }) },
    { name: '슬로우모션',       prompt: 'tower',                 tags: ['slow', 'cinematic'],  physics: p({ timeScale: 0.2, springStiffness: 20 }) },
    { name: '고속 시뮬',        prompt: 'tower',                 tags: ['fast', 'speed'],      physics: p({ timeScale: 3.0, springStiffness: 20 }) },
];

export class SimulationManager {
    constructor(onCardSelect, onPhysicsChange) {
        this.cards = [];
        this.activeCardId = null;
        this.serverOnline = false;
        this.onCardSelect = onCardSelect;       // callback(card)
        this.onPhysicsChange = onPhysicsChange; // callback(physicsParams)

        this._initUI();
        this._checkServer();
        this._loadCards();
    }

    // ==================== SERVER ====================

    async _checkServer() {
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            if (res.ok) {
                this.serverOnline = true;
                document.getElementById('server-dot').classList.add('online');
                document.getElementById('server-label').textContent = 'ONLINE';
            }
        } catch {
            this.serverOnline = false;
        }
    }

    // ==================== CARDS CRUD ====================

    async _loadCards() {
        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`);
                this.cards = await res.json();
            } catch {
                this.cards = [];
            }
        }

        // If no cards (first run or offline), create from presets
        if (this.cards.length === 0) {
            this.cards = PRESETS.map((p, i) => ({
                id: `preset-${i}`,
                name: p.name,
                prompt: p.prompt,
                tags: p.tags,
                physics: { ...p.physics },
                chat: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
            }));

            // Save to server if online
            if (this.serverOnline) {
                for (const card of this.cards) {
                    try {
                        const res = await fetch(`${API_BASE}/api/cards`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(card),
                        });
                        const saved = await res.json();
                        card.id = saved.id; // Use server-assigned ID
                    } catch {}
                }
            }
        }

        this._renderCardList();

        // Auto-select first card
        if (this.cards.length > 0) {
            this.selectCard(this.cards[0].id);
        }
    }

    async createCard(name, prompt, physics) {
        const card = {
            id: `local-${Date.now()}`,
            name: name || 'New Simulation',
            prompt: prompt || '',
            tags: [],
            physics: physics || { ...PRESETS[0].physics },
            chat: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
        };

        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
                const saved = await res.json();
                card.id = saved.id;
            } catch {}
        }

        this.cards.unshift(card);
        this._renderCardList();
        this.selectCard(card.id);
        return card;
    }

    async deleteCard(id) {
        this.cards = this.cards.filter(c => c.id !== id);
        if (this.serverOnline) {
            try { await fetch(`${API_BASE}/api/cards/${id}`, { method: 'DELETE' }); } catch {}
        }

        if (this.activeCardId === id) {
            this.activeCardId = null;
            document.getElementById('card-detail').classList.add('hidden');
            if (this.cards.length > 0) this.selectCard(this.cards[0].id);
        }
        this._renderCardList();
    }

    async duplicateCard(id) {
        const original = this.cards.find(c => c.id === id);
        if (!original) return;
        await this.createCard(
            original.name + ' (copy)',
            original.prompt,
            { ...original.physics }
        );
    }

    async updateCard(id, updates) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;
        Object.assign(card, updates, { updatedAt: new Date().toISOString() });

        if (this.serverOnline) {
            try {
                await fetch(`${API_BASE}/api/cards/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
            } catch {}
        }
    }

    // ==================== CARD SELECTION ====================

    selectCard(id) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;

        this.activeCardId = id;

        // Update active styling
        document.querySelectorAll('.sim-card').forEach(el => el.classList.remove('active'));
        const cardEl = document.querySelector(`.sim-card[data-id="${id}"]`);
        if (cardEl) cardEl.classList.add('active');

        // Show detail panel
        document.getElementById('card-detail').classList.remove('hidden');

        // Update physics sliders
        this._syncPhysicsUI(card.physics);

        // Update chat messages
        this._renderChat(card.chat);

        // Update prompt input
        document.getElementById('prompt-input').value = card.prompt;

        // Notify app
        if (this.onCardSelect) this.onCardSelect(card);
    }

    getActiveCard() {
        return this.cards.find(c => c.id === this.activeCardId) || null;
    }

    // ==================== UI RENDERING ====================

    _renderCardList() {
        const list = document.getElementById('card-list');
        list.innerHTML = '';

        for (const card of this.cards) {
            const el = document.createElement('div');
            el.className = `sim-card${card.id === this.activeCardId ? ' active' : ''}`;
            el.dataset.id = card.id;

            const tagsHtml = (card.tags || [])
                .map(t => `<span class="card-tag">${t}</span>`)
                .join('');

            const timeAgo = this._timeAgo(card.updatedAt);

            const displayName = tPreset(card.name) || card.name;
            el.innerHTML = `
                <div class="card-name">${this._escapeHtml(displayName)}</div>
                <div class="card-prompt">${this._escapeHtml(card.prompt || 'No prompt')}</div>
                <div class="card-meta">
                    <div class="card-tags">${tagsHtml}</div>
                    <span>${timeAgo}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn dup" title="Duplicate">&#9851;</button>
                    <button class="card-action-btn delete" title="Delete">&times;</button>
                </div>
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.card-action-btn')) return;
                this.selectCard(card.id);
            });

            el.querySelector('.dup').addEventListener('click', () => this.duplicateCard(card.id));
            el.querySelector('.delete').addEventListener('click', () => this.deleteCard(card.id));

            list.appendChild(el);
        }
    }

    _renderChat(messages) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = `<div class="chat-msg system">AI와 대화하며 물리 파라미터를 조정하세요</div>`;
            return;
        }

        for (const msg of messages) {
            const el = document.createElement('div');
            el.className = `chat-msg ${msg.role}`;
            el.textContent = msg.content;
            container.appendChild(el);
        }

        container.scrollTop = container.scrollHeight;
    }

    // ==================== PHYSICS UI SYNC ====================

    _syncPhysicsUI(physics) {
        const paramMap = {
            'param-gravity': physics.gravity,
            'param-damping': physics.damping,
            'param-springK': physics.springStiffness,
            'param-timeScale': physics.timeScale,
            'param-friction': physics.friction,
            'param-bounciness': physics.bounciness,
            'param-particles': physics.particleCount,
            'param-foundation': physics.foundation,
            'param-density': physics.density,
            'param-elasticity': physics.elasticity,
            'param-yieldStrength': physics.yieldStrength,
            'param-windX': physics.windX,
            'param-windY': physics.windY,
            'param-windZ': physics.windZ,
            'param-turbulence': physics.turbulence,
            'param-viscosity': physics.viscosity,
            'param-temperature': physics.temperature,
            'param-seismic': physics.seismic,
            'param-seismicFreq': physics.seismicFreq,
            'param-snowLoad': physics.snowLoad,
            'param-floodLevel': physics.floodLevel,
        };

        for (const [id, val] of Object.entries(paramMap)) {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = val;
                const display = document.querySelector(`.param-value[data-for="${id}"]`);
                if (display) display.textContent = this._formatValue(id, val);
            }
        }
    }

    _getPhysicsFromUI() {
        const g = (id) => parseFloat(document.getElementById(id).value);
        return {
            gravity: g('param-gravity'),
            damping: g('param-damping'),
            springStiffness: g('param-springK'),
            timeScale: g('param-timeScale'),
            friction: g('param-friction'),
            bounciness: g('param-bounciness'),
            particleCount: parseInt(document.getElementById('param-particles').value),
            foundation: g('param-foundation'),
            density: g('param-density'),
            elasticity: g('param-elasticity'),
            yieldStrength: g('param-yieldStrength'),
            windX: g('param-windX'),
            windY: g('param-windY'),
            windZ: g('param-windZ'),
            turbulence: g('param-turbulence'),
            viscosity: g('param-viscosity'),
            temperature: g('param-temperature'),
            seismic: g('param-seismic'),
            seismicFreq: g('param-seismicFreq'),
            snowLoad: g('param-snowLoad'),
            floodLevel: g('param-floodLevel'),
        };
    }

    _formatValue(id, val) {
        if (id === 'param-particles') return Math.round(val).toString();
        if (id === 'param-temperature') return Math.round(val).toString();
        return parseFloat(val).toFixed(2);
    }

    // ==================== CHAT ====================

    async addChatMessage(role, content) {
        const card = this.getActiveCard();
        if (!card) return;

        const msg = { role, content, timestamp: new Date().toISOString() };
        card.chat.push(msg);
        this._renderChat(card.chat);

        // Save to server
        if (this.serverOnline) {
            try {
                await fetch(`${API_BASE}/api/cards/${card.id}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(msg),
                });
            } catch {}
        }

        return msg;
    }

    _handleChatSubmit() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        this.addChatMessage('user', content);

        // AI response placeholder - parse natural language physics commands
        const response = this._processNaturalLanguage(content);
        setTimeout(() => {
            this.addChatMessage('assistant', response);
        }, 300);
    }

    _processNaturalLanguage(input) {
        const lower = input.toLowerCase();
        const card = this.getActiveCard();
        if (!card) return 'No active simulation';

        // Simple natural language processing for physics changes
        if (lower.includes('무중력') || lower.includes('zero gravity') || lower.includes('gravity off')) {
            card.physics.gravity = 0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity set to 0. Particles will float freely.';
        }

        if (lower.includes('중력') && (lower.includes('강하') || lower.includes('높') || lower.includes('increase'))) {
            card.physics.gravity = -20;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity increased to -20 m/s². Heavy pull!';
        }

        if (lower.includes('바람') || lower.includes('wind')) {
            const strength = lower.includes('강') || lower.includes('strong') ? 15 : 5;
            card.physics.windX = strength;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return `Wind set to ${strength} m/s on X axis.`;
        }

        if (lower.includes('탄성') || lower.includes('bouncy') || lower.includes('elastic')) {
            card.physics.bounciness = 0.9;
            card.physics.springStiffness = 5;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Bounciness set to 0.9, spring stiffness reduced for elastic behavior.';
        }

        if (lower.includes('점성') || lower.includes('viscous') || lower.includes('fluid')) {
            card.physics.viscosity = 3.0;
            card.physics.damping = 0.85;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Viscosity set to 3.0, damping increased for fluid-like behavior.';
        }

        if (lower.includes('리셋') || lower.includes('reset') || lower.includes('초기화')) {
            card.physics = { ...PRESETS[0].physics };
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Physics reset to defaults.';
        }

        if (lower.includes('느리') || lower.includes('slow')) {
            card.physics.timeScale = 0.3;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale reduced to 0.3x. Slow motion activated.';
        }

        if (lower.includes('빠르') || lower.includes('fast')) {
            card.physics.timeScale = 3.0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale set to 3.0x. Fast forward!';
        }

        if (lower.includes('뜨거') || lower.includes('hot') || lower.includes('heat')) {
            card.physics.temperature = 3000;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 3000K. Particles will have thermal agitation.';
        }

        if (lower.includes('차가') || lower.includes('cold') || lower.includes('freeze')) {
            card.physics.temperature = 10;
            card.physics.damping = 0.999;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 10K, high damping. Near-frozen state.';
        }

        return `I understood your request. Try commands like: "무중력", "강한 바람", "점성 유체", "탄성", "느리게", "빠르게", "뜨겁게", "차갑게", "리셋". Future updates will support full natural language AI processing.`;
    }

    // ==================== UI INITIALIZATION ====================

    _initUI() {
        // New card button
        document.getElementById('new-card-btn').addEventListener('click', () => {
            this.createCard();
        });

        // Section toggles
        document.querySelectorAll('.section-title').forEach(title => {
            title.addEventListener('click', () => {
                const targetId = title.dataset.toggle;
                const target = document.getElementById(targetId);
                if (target) {
                    target.classList.toggle('collapsed');
                    title.classList.toggle('collapsed');
                }
            });
        });

        // Physics slider changes
        document.querySelectorAll('.param-group input[type="range"]').forEach(slider => {
            slider.addEventListener('input', () => {
                // Update display value
                const display = document.querySelector(`.param-value[data-for="${slider.id}"]`);
                if (display) display.textContent = this._formatValue(slider.id, slider.value);

                // Update card and notify
                const card = this.getActiveCard();
                if (card) {
                    card.physics = this._getPhysicsFromUI();
                    if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                }
            });

            // Save on mouse up
            slider.addEventListener('change', () => {
                const card = this.getActiveCard();
                if (card) {
                    this.updateCard(card.id, { physics: card.physics });
                }
            });
        });

        // Chat
        document.getElementById('chat-send-btn').addEventListener('click', () => this._handleChatSubmit());
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleChatSubmit();
        });
    }

    // ==================== UTILS ====================

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
