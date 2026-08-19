import fs from 'node:fs';
import path from 'node:path';

import QRCode from 'qrcode';

const outputDir = path.resolve(process.cwd(), 'assets', 'qr');
const DEFAULT_PUBLIC_APP_URL = 'https://too-many-cooks-bobcat.com';
const configuredBaseUrl = String(process.env.PUBLIC_APP_URL ?? DEFAULT_PUBLIC_APP_URL).trim();

if (!configuredBaseUrl) {
  throw new Error('Set PUBLIC_APP_URL to a live deployed site URL that already resolves publicly.');
}

const normalizedBaseUrl = configuredBaseUrl.endsWith('/')
  ? configuredBaseUrl.slice(0, -1)
  : configuredBaseUrl;
const qrUrl = `${normalizedBaseUrl}/?go=app`;

if (!process.env.PUBLIC_APP_URL) {
  console.log(`PUBLIC_APP_URL not set. Using default: ${DEFAULT_PUBLIC_APP_URL}`);
}

fs.mkdirSync(outputDir, { recursive: true });

const svgPath = path.join(outputDir, 'app-permanent.svg');
const pngPath = path.join(outputDir, 'app-permanent.png');

await QRCode.toFile(svgPath, qrUrl, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

await QRCode.toFile(pngPath, qrUrl, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

console.log(`Generated permanent app QR for: ${qrUrl}`);
console.log(`SVG: ${svgPath}`);
console.log(`PNG: ${pngPath}`);
