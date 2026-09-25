import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const outputDir = path.resolve(process.cwd(), 'assets', 'qr');

const FLYER_DOMAIN = 'https://too-many-cooks-bobcat.com';

fs.mkdirSync(outputDir, { recursive: true });

const svgPath = path.join(outputDir, 'flyer.svg');
const pngPath = path.join(outputDir, 'flyer.png');

await QRCode.toFile(svgPath, FLYER_DOMAIN, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

await QRCode.toFile(pngPath, FLYER_DOMAIN, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

console.log(`✓ Generated flyer QR codes for: ${FLYER_DOMAIN}`);
console.log(`  SVG: ${svgPath}`);
console.log(`  PNG: ${pngPath}`);
