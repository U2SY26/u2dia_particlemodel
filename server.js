import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = join(__dirname, 'data');
const CARDS_FILE = join(DATA_DIR, 'cards.json');
const PID_FILE = join(__dirname, '.server.pid');

// Ensure data directory
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// Initialize cards file
if (!existsSync(CARDS_FILE)) {
    writeFileSync(CARDS_FILE, JSON.stringify({ cards: [], version: 1 }));
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ==================== SIMULATION CARDS API ====================

// List all cards
app.get('/api/cards', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    res.json(data.cards);
});

// Get single card
app.get('/api/cards/:id', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    const card = data.cards.find(c => c.id === req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
});

// Create card
app.post('/api/cards', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    const card = {
        id: uuidv4(),
        name: req.body.name || 'Untitled Simulation',
        prompt: req.body.prompt || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        physics: {
            gravity: -9.81, damping: 0.97, springStiffness: 20.0,
            particleCount: 25000, timeScale: 1.0,
            friction: 0.8, bounciness: 0.3,
            windX: 0, windY: 0, windZ: 0, turbulence: 0,
            viscosity: 0, temperature: 293,
            foundation: 5.0, density: 2.4, elasticity: 0.3, yieldStrength: 50,
            seismic: 0, seismicFreq: 2.0, snowLoad: 0, floodLevel: 0,
            ...(req.body.physics || {}),
        },
        chat: req.body.chat || [],
        structureType: req.body.structureType || null,
        thumbnail: req.body.thumbnail || null,
        tags: req.body.tags || [],
        // Future: NVIDIA Cosmos/Omniverse fields
        worldModel: {
            engine: null,        // 'cosmos' | 'omniverse' | 'custom'
            sceneId: null,
            exportFormat: null,  // 'usd' | 'gltf' | 'custom'
            metadata: {},
        },
    };
    data.cards.push(card);
    writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(card);
});

// Update card
app.put('/api/cards/:id', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    const idx = data.cards.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Card not found' });

    data.cards[idx] = {
        ...data.cards[idx],
        ...req.body,
        id: data.cards[idx].id,
        createdAt: data.cards[idx].createdAt,
        updatedAt: new Date().toISOString(),
    };
    writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2));
    res.json(data.cards[idx]);
});

// Delete card
app.delete('/api/cards/:id', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    data.cards = data.cards.filter(c => c.id !== req.params.id);
    writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2));
    res.status(204).end();
});

// Duplicate card
app.post('/api/cards/:id/duplicate', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    const original = data.cards.find(c => c.id === req.params.id);
    if (!original) return res.status(404).json({ error: 'Card not found' });

    const clone = {
        ...JSON.parse(JSON.stringify(original)),
        id: uuidv4(),
        name: original.name + ' (copy)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    data.cards.push(clone);
    writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(clone);
});

// ==================== CHAT MESSAGES PER CARD ====================

app.post('/api/cards/:id/chat', (req, res) => {
    const data = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'));
    const card = data.cards.find(c => c.id === req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const message = {
        id: uuidv4(),
        role: req.body.role || 'user',
        content: req.body.content || '',
        timestamp: new Date().toISOString(),
    };
    card.chat.push(message);
    card.updatedAt = new Date().toISOString();
    writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(message);
});

// ==================== SERVER STATUS ====================

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        pid: process.pid,
        version: '1.0.0',
        capabilities: {
            physics: true,
            ai_chat: true,
            worldModel: false,  // future
            cosmos: false,      // future
            omniverse: false,   // future
        },
    });
});

// ==================== COMMUNITY CONTRIBUTIONS ====================

const CONTRIB_FILE = join(DATA_DIR, 'contributions.json');
if (!existsSync(CONTRIB_FILE)) {
    writeFileSync(CONTRIB_FILE, JSON.stringify({ contributions: [], version: 1 }));
}

app.get('/api/contributions', (req, res) => {
    const data = JSON.parse(readFileSync(CONTRIB_FILE, 'utf-8'));
    res.json(data.contributions);
});

app.post('/api/contributions', (req, res) => {
    const data = JSON.parse(readFileSync(CONTRIB_FILE, 'utf-8'));
    const contrib = {
        id: uuidv4(),
        author: req.body.author || 'Anonymous',
        domain: req.body.domain || 'other',
        type: req.body.type || 'material',
        content: req.body.content || '',
        status: 'pending', // pending → reviewed → accepted/rejected
        createdAt: new Date().toISOString(),
        votes: 0,
    };
    data.contributions.push(contrib);
    writeFileSync(CONTRIB_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(contrib);
});

app.post('/api/contributions/:id/vote', (req, res) => {
    const data = JSON.parse(readFileSync(CONTRIB_FILE, 'utf-8'));
    const contrib = data.contributions.find(c => c.id === req.params.id);
    if (!contrib) return res.status(404).json({ error: 'Not found' });
    contrib.votes += (req.body.direction === 'down' ? -1 : 1);
    writeFileSync(CONTRIB_FILE, JSON.stringify(data, null, 2));
    res.json(contrib);
});

// ==================== FUTURE: WORLD MODEL ENDPOINTS ====================

app.post('/api/worldmodel/export', (req, res) => {
    // Placeholder for NVIDIA Cosmos/Omniverse export
    res.status(501).json({
        error: 'Not implemented',
        message: 'World model export will be available in a future update',
        supportedFormats: ['usd', 'gltf'],
    });
});

app.post('/api/worldmodel/import', (req, res) => {
    res.status(501).json({
        error: 'Not implemented',
        message: 'World model import will be available in a future update',
    });
});

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
    // Write PID file for server-ctl
    writeFileSync(PID_FILE, String(process.pid));
    console.log(`\n  PARTICLE ARCHITECT SERVER`);
    console.log(`  ========================`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  Data: ${DATA_DIR}`);
    console.log(`  Press Ctrl+C to stop\n`);
});

// Cleanup on exit
process.on('SIGTERM', () => {
    console.log('\n  Server shutting down...');
    server.close();
    try { writeFileSync(PID_FILE, ''); } catch {}
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n  Server shutting down...');
    server.close();
    try { writeFileSync(PID_FILE, ''); } catch {}
    process.exit(0);
});
