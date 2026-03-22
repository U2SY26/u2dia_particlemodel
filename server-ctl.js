#!/usr/bin/env node
/**
 * Server Control CLI
 * Usage:
 *   node server-ctl.js start   - Start server (background)
 *   node server-ctl.js stop    - Stop server
 *   node server-ctl.js restart - Restart server
 *   node server-ctl.js status  - Check server status
 */
import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE = join(__dirname, '.server.pid');
const LOG_FILE = join(__dirname, 'server.log');

function getPid() {
    if (!existsSync(PID_FILE)) return null;
    const pid = readFileSync(PID_FILE, 'utf-8').trim();
    if (!pid) return null;
    try {
        process.kill(parseInt(pid), 0);
        return parseInt(pid);
    } catch {
        return null;
    }
}

function start() {
    const existing = getPid();
    if (existing) {
        console.log(`  Server already running (PID: ${existing})`);
        return;
    }

    console.log('  Starting Particle Architect server...');
    const child = spawn('node', ['server.js'], {
        cwd: __dirname,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', d => process.stdout.write(d));
    child.stderr.on('data', d => process.stderr.write(d));
    child.unref();

    // Wait a moment and verify
    setTimeout(() => {
        const pid = getPid();
        if (pid) {
            console.log(`  Server started (PID: ${pid})`);
        } else {
            console.log('  Failed to start server');
        }
    }, 1500);
}

function stop() {
    const pid = getPid();
    if (!pid) {
        console.log('  Server is not running');
        return;
    }

    console.log(`  Stopping server (PID: ${pid})...`);
    try {
        process.kill(pid, 'SIGTERM');
        writeFileSync(PID_FILE, '');
        console.log('  Server stopped');
    } catch (e) {
        console.log('  Error stopping server:', e.message);
    }
}

function restart() {
    stop();
    setTimeout(start, 1000);
}

function status() {
    const pid = getPid();
    if (pid) {
        console.log(`  Server is RUNNING (PID: ${pid})`);
        console.log(`  http://localhost:${process.env.PORT || 3000}`);
    } else {
        console.log('  Server is STOPPED');
    }
}

const cmd = process.argv[2] || 'status';
switch (cmd) {
    case 'start': start(); break;
    case 'stop': stop(); break;
    case 'restart': restart(); break;
    case 'status': status(); break;
    default:
        console.log('Usage: node server-ctl.js [start|stop|restart|status]');
}
