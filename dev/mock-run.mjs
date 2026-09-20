// Corre Astro apuntando al servidor de datos de prueba (npm run mock).
// Existe para que los comandos funcionen igual en Windows, Mac y Linux:
// poner variables de entorno adelante del comando solo anda en Linux/Mac.
// Uso: node dev/mock-run.mjs dev|build
import { spawn } from 'node:child_process';

const cmd = process.argv[2] === 'build' ? 'build' : 'dev';
const env = {
  ...process.env,
  MOCK_UPSTREAM: process.env.MOCK_UPSTREAM || 'http://localhost:4599',
  SHOW_AD_PLACEHOLDERS: '1',
};

const hijo = spawn('npx', ['astro', cmd, ...process.argv.slice(3)], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
hijo.on('exit', (code) => process.exit(code ?? 0));
