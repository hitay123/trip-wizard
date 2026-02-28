/**
 * start-public.js — run from the tripWizard root
 * Starts server + Vite client + ngrok tunnel so anyone can access the app.
 *
 * Usage:
 *   1. Add NGROK_AUTHTOKEN=<your_token> to server/.env
 *      (sign up free at https://dashboard.ngrok.com → Your Authtoken)
 *   2. node start-public.js
 */

import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dir, 'server');
const clientDir = resolve(__dir, 'client');

// Parse server/.env manually (avoids CJS/ESM module path issues on Windows)
readFileSync(resolve(serverDir, '.env'), 'utf-8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
  .forEach((l) => {
    const eq = l.indexOf('=');
    const k = l.slice(0, eq).trim();
    const v = l.slice(eq + 1).trim();
    if (k) process.env[k] ??= v;
  });

// Load ngrok SDK from server/node_modules using file:// URL (required on Windows)
const ngrokUrl = pathToFileURL(resolve(serverDir, 'node_modules/@ngrok/ngrok/index.js')).href;
const { forward: ngrokForward, disconnect: ngrokDisconnect } = await import(ngrokUrl);

const VITE_PORT = 5173;

// ── Kill any processes already on our ports ───────────────────────────────────
function killPort(port) {
  try {
    execSync(
      `powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess -Force"`,
      { stdio: 'ignore' }
    );
  } catch {
    // port was free — fine
  }
}

console.log('\n🧙 Trip Wizard — starting public tunnel…\n');
console.log('   Cleaning up any existing processes…');
killPort(3001);
killPort(VITE_PORT);
await new Promise((r) => setTimeout(r, 1000));

// ── Spawn helper ──────────────────────────────────────────────────────────────
function run(cmd, cwd, label) {
  const child = spawn(cmd, { cwd, shell: true, stdio: 'pipe' });
  child.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  return child;
}

// ── Start processes ───────────────────────────────────────────────────────────
run('node index.js', serverDir, 'server');
await new Promise((r) => setTimeout(r, 2000));

run('npm run dev', clientDir, 'client');
await new Promise((r) => setTimeout(r, 4000));

// ── ngrok tunnel ──────────────────────────────────────────────────────────────
const token = process.env.NGROK_AUTHTOKEN;
if (!token) {
  console.error('\n❌  NGROK_AUTHTOKEN missing from server/.env');
  console.error('    1. Sign up free at https://dashboard.ngrok.com');
  console.error('    2. Copy Your Authtoken');
  console.error('    3. Add this line to server/.env:\n');
  console.error('       NGROK_AUTHTOKEN=your_token_here\n');
  process.exit(1);
}

// Close any lingering ngrok sessions from previous runs, then open fresh
try { await ngrokDisconnect(); } catch { /* no existing session */ }

try {
  const listener = await ngrokForward({ addr: VITE_PORT, authtoken: token });
  const url = listener.url();

  console.log('\n' + '═'.repeat(62));
  console.log(`  🌐  Public URL ➜  ${url}`);
  console.log('  Share this with anyone — works from any device or network!');
  console.log('═'.repeat(62) + '\n');
} catch (err) {
  console.error('\n❌  ngrok error:', err.message);
  process.exit(1);
}

process.on('SIGINT', () => { console.log('\n👋 Shutting down…'); process.exit(0); });
