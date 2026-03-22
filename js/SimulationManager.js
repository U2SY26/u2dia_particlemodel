/**
 * SimulationManager
 * Handles simulation card CRUD, sidebar UI, physics parameter binding,
 * AI chat interface, and server communication.
 */

const API_BASE = '';  // Same origin

// Default physics presets for quick card creation
const PRESETS = [
    {
        name: '3층 건물',
        prompt: '3층 건물',
        tags: ['building', 'basic'],
        physics: { gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000, timeScale: 1.0, friction: 0.8, bounciness: 0.3, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '고딕 성당',
        prompt: 'gothic cathedral',
        tags: ['cathedral', 'gothic'],
        physics: { gravity: -9.81, damping: 0.97, springStiffness: 25, particleCount: 25000, timeScale: 1.0, friction: 0.8, bounciness: 0.2, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '거대 현수교',
        prompt: 'large bridge',
        tags: ['bridge', 'large'],
        physics: { gravity: -9.81, damping: 0.95, springStiffness: 30, particleCount: 25000, timeScale: 1.0, friction: 0.7, bounciness: 0.4, windX: 2, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '무중력 파티클',
        prompt: 'sphere',
        tags: ['zero-g', 'experiment'],
        physics: { gravity: 0, damping: 0.99, springStiffness: 5, particleCount: 25000, timeScale: 1.0, friction: 0.1, bounciness: 0.9, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '강풍 테스트',
        prompt: 'tower',
        tags: ['wind', 'stress-test'],
        physics: { gravity: -9.81, damping: 0.93, springStiffness: 15, particleCount: 25000, timeScale: 1.0, friction: 0.6, bounciness: 0.3, windX: 12, windY: 3, windZ: -5, viscosity: 0.5, temperature: 293 },
    },
    {
        name: '점성 유체',
        prompt: 'dome',
        tags: ['fluid', 'viscous'],
        physics: { gravity: -4.0, damping: 0.85, springStiffness: 3, particleCount: 25000, timeScale: 0.8, friction: 0.95, bounciness: 0.05, windX: 0, windY: 0, windZ: 0, viscosity: 4.0, temperature: 350 },
    },
    {
        name: '탄성 피라미드',
        prompt: 'pyramid',
        tags: ['elastic', 'bouncy'],
        physics: { gravity: -9.81, damping: 0.98, springStiffness: 8, particleCount: 25000, timeScale: 1.2, friction: 0.4, bounciness: 0.85, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '미니어처 성',
        prompt: 'small castle',
        tags: ['castle', 'mini'],
        physics: { gravity: -9.81, damping: 0.97, springStiffness: 35, particleCount: 15000, timeScale: 1.0, friction: 0.8, bounciness: 0.2, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
    {
        name: '고온 플라즈마',
        prompt: 'sphere',
        tags: ['plasma', 'hot'],
        physics: { gravity: 0.5, damping: 0.90, springStiffness: 2, particleCount: 30000, timeScale: 1.5, friction: 0.1, bounciness: 0.7, windX: 0, windY: 5, windZ: 0, viscosity: 0.2, temperature: 4500 },
    },
    {
        name: '경기장 시뮬',
        prompt: 'stadium',
        tags: ['stadium', 'large'],
        physics: { gravity: -9.81, damping: 0.97, springStiffness: 22, particleCount: 25000, timeScale: 1.0, friction: 0.8, bounciness: 0.3, windX: 0, windY: 0, windZ: 0, viscosity: 0, temperature: 293 },
    },
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

            el.innerHTML = `
                <div class="card-name">${this._escapeHtml(card.name)}</div>
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
            'param-windX': physics.windX,
            'param-windY': physics.windY,
            'param-windZ': physics.windZ,
            'param-viscosity': physics.viscosity,
            'param-temperature': physics.temperature,
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
        return {
            gravity: parseFloat(document.getElementById('param-gravity').value),
            damping: parseFloat(document.getElementById('param-damping').value),
            springStiffness: parseFloat(document.getElementById('param-springK').value),
            timeScale: parseFloat(document.getElementById('param-timeScale').value),
            friction: parseFloat(document.getElementById('param-friction').value),
            bounciness: parseFloat(document.getElementById('param-bounciness').value),
            particleCount: parseInt(document.getElementById('param-particles').value),
            windX: parseFloat(document.getElementById('param-windX').value),
            windY: parseFloat(document.getElementById('param-windY').value),
            windZ: parseFloat(document.getElementById('param-windZ').value),
            viscosity: parseFloat(document.getElementById('param-viscosity').value),
            temperature: parseFloat(document.getElementById('param-temperature').value),
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
