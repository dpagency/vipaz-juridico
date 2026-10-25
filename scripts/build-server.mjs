import { build } from 'esbuild';
import { resolve } from 'node:path';

const projectRoot = process.cwd();

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  absWorkingDir: projectRoot,
};

await Promise.all([
  build({
    ...common,
    entryPoints: [resolve(projectRoot, 'server.ts')],
    sourcemap: true,
    outfile: resolve(projectRoot, 'dist/server.cjs'),
  }),
  build({
    ...common,
    entryPoints: [resolve(projectRoot, 'src/server/vipazDeliveryReviewHandler.ts')],
    outfile: resolve(projectRoot, 'src/server/vipazDeliveryReviewHandler.bundle.cjs'),
  }),
]);
