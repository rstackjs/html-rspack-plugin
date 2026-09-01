import fs from 'node:fs';
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
  it('reuses the template until the template file changes', async () => {
    const context = createProject({
      'template.ejs': '<html><body>first</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({ template: './template.ejs' });
    const evaluateTemplate = rs.spyOn(htmlPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({ context, htmlPlugin });

    try {
      const firstAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(firstAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      const unchangedAssets = expectSuccessfulBuild(
        await runCompiler(compiler),
      );
      expect(unchangedAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'src/index.js': 'console.log("changed entry");',
      });
      expectSuccessfulBuild(await runCompiler(compiler));
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'template.ejs': '<html><body>second</body></html>',
      });
      const changedAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(changedAssets['index.html']).toContain('second');
      expect(evaluateTemplate).toHaveBeenCalledTimes(2);
    } finally {
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
