import { EventEmitter, on } from 'node:events';
import fs from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { describe, expect, it, rs } from 'rstack/test';
import {
  closeCompiler,
  createCompiler,
  createProject,
  getCompilationResult,
  HtmlRspackPlugin,
  runCompiler,
  writeFiles,
} from './helpers/compile.js';

function expectSuccessfulBuild(stats) {
  const result = getCompilationResult(stats);
  expect(result.info.errors).toEqual([]);
  return result.assets;
}

describe('template cache', () => {
  it('reuses the template in watch mode until the template file changes', async () => {
    const context = createProject({
      'template.ejs': '<html><body>first</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({ template: './template.ejs' });
    const evaluateTemplate = rs.spyOn(htmlPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({ context, htmlPlugin });
    const events = new EventEmitter();
    const builds = on(events, 'build', { signal: AbortSignal.timeout(10_000) });
    const nextBuild = async () => {
      const {
        value: [error, stats],
      } = await builds.next();
      if (error) throw error;
      // Watchpack starts watching on the next tick after the build callback.
      await setImmediate();
      return expectSuccessfulBuild(stats);
    };

    try {
      const watching = compiler.watch(
        { aggregateTimeout: 20, poll: 20 },
        (error, stats) => events.emit('build', error, stats),
      );
      const firstAssets = await nextBuild();
      expect(firstAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      watching.invalidate();
      const unchangedAssets = await nextBuild();
      expect(unchangedAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'src/index.js': 'console.log("changed entry");',
      });
      await nextBuild();
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'template.ejs': '<html><body>second</body></html>',
      });
      const changedAssets = await nextBuild();
      expect(changedAssets['index.html']).toContain('second');
      expect(evaluateTemplate).toHaveBeenCalledTimes(2);
    } finally {
      await builds.return();
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });

  it('regenerates HTML when the plugin cache is disabled', async () => {
    const context = createProject({
      'template.ejs': '<html><body>template</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({
      cache: false,
      template: './template.ejs',
    });
    const evaluateTemplate = rs.spyOn(htmlPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({ context, htmlPlugin });

    try {
      expectSuccessfulBuild(await runCompiler(compiler));
      writeFiles(context, {
        'src/index.js': 'console.log("changed entry");',
      });
      expectSuccessfulBuild(await runCompiler(compiler));

      expect(evaluateTemplate).toHaveBeenCalledTimes(2);
    } finally {
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });
});
