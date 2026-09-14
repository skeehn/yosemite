import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let sha = 'dev';
try {
  sha = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {
  /* not a git checkout */
}
writeFileSync(join(root, 'lib', 'build-id.ts'), `// generated at build time — do not edit\nexport const BUILD_ID = ${JSON.stringify(sha)};\n`);
console.log('BUILD_ID=' + sha);
