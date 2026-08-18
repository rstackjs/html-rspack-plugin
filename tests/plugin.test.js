import { Buffer } from 'node:buffer';
import { describe, expect, it } from '@rstest/core';
import { compile, HtmlRspackPlugin } from './helpers/compile.js';

describe('HtmlRspackPlugin', () => {
  it('generates HTML for the default entry', async () => {
    const { assets } = await compile();
    const html = assets['index.html'];

    expect(Object.keys(assets)).toContain('main.js');
    expect(html).toContain('<title>Rspack App</title>');
    expect(html).toMatch(
      /<script defer(?:="defer")? src="main\.js"><\/script>\s*<\/head>/,
    );
  });

  it('generates one HTML file for each named entry', async () => {
    const { assets } = await compile({
      files: {
        'src/admin.js': 'console.log("admin");',
      },
      config: {
        entry: {
          admin: './src/admin.js',
          main: './src/index.js',
        },
      },
      pluginOptions: {
        filename: (name) => `pages/${name}.html`,
        publicPath: '/',
      },
    });

    expect(Object.keys(assets)).toEqual(
      expect.arrayContaining([
        'admin.js',
        'main.js',
        'pages/admin.html',
        'pages/main.html',
      ]),
    );
    expect(assets['pages/admin.html']).toContain('src="/admin.js"');
    expect(assets['pages/main.html']).toContain('src="/main.js"');
  });

  it('renders a custom template with async template parameters', async () => {
    const { assets } = await compile({
      files: {
        'template.ejs':
          '<!doctype html><title><%= title %></title><script src="<%= bundle %>"></script>',
      },
      pluginOptions: {
        inject: false,
        template: './template.ejs',
        templateParameters: async (_compilation, files) => ({
          bundle: files.js[0],
          title: 'Custom title',
        }),
      },
    });

    expect(assets['index.html']).toBe(
      '<!doctype html><title>Custom title</title><script src="main.js"></script>',
    );
  });

  it('accepts an empty templateContent value', async () => {
    const { assets } = await compile({
      pluginOptions: {
        inject: false,
        templateContent: '',
      },
    });

    expect(assets['index.html']).toBe('');
  });

  it('supports each injection target', async () => {
    const scenarios = [
      { inject: 'head', expectedParent: 'head' },
      { inject: 'body', expectedParent: 'body' },
      { inject: false, expectedParent: null },
    ];

    for (const scenario of scenarios) {
      const { assets } = await compile({
        pluginOptions: {
          inject: scenario.inject,
          scriptLoading: 'blocking',
        },
      });
      const html = assets['index.html'];
      const scriptPosition = html.indexOf('<script');

      if (scenario.expectedParent === null) {
        expect(scriptPosition).toBe(-1);
      } else {
        expect(scriptPosition).toBeGreaterThan(
          html.indexOf(`<${scenario.expectedParent}>`),
        );
        expect(scriptPosition).toBeLessThan(
          html.indexOf(`</${scenario.expectedParent}>`),
        );
      }
    }
  });

  it('supports each script loading mode', async () => {
    const scenarios = [
      ['blocking', '<script src="main.js">'],
      ['defer', '<script defer'],
      ['module', '<script type="module"'],
      ['systemjs-module', '<script type="systemjs-module"'],
    ];

    for (const [scriptLoading, expected] of scenarios) {
      const { assets } = await compile({
        pluginOptions: { scriptLoading },
      });

      expect(assets['index.html']).toContain(expected);
    }
  });

  it('injects Rspack native CSS after deferred scripts', async () => {
    const { assets } = await compile({
      files: {
        'src/index.js': 'import "./style.css";',
        'src/style.css': 'body { color: tomato; }',
      },
      config: {
        experiments: { css: true },
        module: {
          rules: [{ test: /\.css$/, type: 'css' }],
        },
      },
    });
    const html = assets['index.html'];

    expect(Object.keys(assets)).toContain('main.css');
    expect(html).toContain('<link href="main.css" rel="stylesheet">');
    expect(html.indexOf('<script')).toBeLessThan(html.indexOf('<link'));
  });

  it('adds base, meta, favicon and XHTML tags together', async () => {
    const { assets } = await compile({
      files: {
        'favicon.ico': Buffer.from('icon'),
      },
      pluginOptions: {
        base: { href: '/app/', target: '_blank' },
        favicon: './favicon.ico',
        meta: { viewport: 'width=device-width' },
        xhtml: true,
      },
    });
    const html = assets['index.html'];

    expect(Object.keys(assets)).toContain('favicon.ico');
    expect(html).toContain('<base href="/app/" target="_blank"/>');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width"/>',
    );
    expect(html).toContain('<link rel="icon" href="favicon.ico"/>');
  });

  it('applies a public path and compilation hash to assets', async () => {
    const { assets, info } = await compile({
      config: {
        output: { filename: 'assets/[name].js' },
      },
      pluginOptions: {
        hash: true,
        publicPath: '/cdn/',
      },
    });

    expect(assets['index.html']).toContain(
      `src="/cdn/assets/main.js?${info.hash}"`,
    );
  });

  it('encodes emitted asset names in URLs', async () => {
    const { assets } = await compile({
      config: {
        output: { filename: 'assets/[name] file.js' },
      },
    });

    expect(assets['index.html']).toContain('src="assets/main%20file.js"');
  });

  it('replaces content hashes in the HTML filename', async () => {
    const { assets } = await compile({
      pluginOptions: {
        filename: 'page.[contenthash:8].html',
      },
    });
    const htmlFilename = Object.keys(assets).find((name) =>
      name.endsWith('.html'),
    );

    expect(htmlFilename).toMatch(/^page\.[a-f0-9]{8}\.html$/);
  });

  it('filters and manually sorts named chunks', async () => {
    const { assets } = await compile({
      files: {
        'src/admin.js': 'console.log("admin");',
        'src/ignored.js': 'console.log("ignored");',
      },
      config: {
        entry: {
          main: './src/index.js',
          ignored: './src/ignored.js',
          admin: './src/admin.js',
        },
      },
      pluginOptions: {
        chunks: ['admin', 'main'],
        chunksSortMode: 'manual',
      },
    });
    const html = assets['index.html'];

    expect(html).not.toContain('ignored.js');
    expect(html.indexOf('admin.js')).toBeLessThan(html.indexOf('main.js'));
  });

  it('runs an async HTML minifier', async () => {
    const { assets } = await compile({
      pluginOptions: {
        inject: false,
        minify: async (html) => html.replace(/>\s+</g, '><').trim(),
        templateContent: '<html>\n  <body>content</body>\n</html>',
      },
    });

    expect(assets['index.html']).toBe('<html><body>content</body></html>');
  });

  it('emits an error page when a template cannot be loaded', async () => {
    const { assets, info } = await compile({
      allowErrors: true,
      pluginOptions: {
        template: './missing.html',
      },
    });

    expect(info.errors.length).toBeGreaterThan(0);
    expect(assets['index.html']).toContain('Child compilation failed');
  });

  it('generates HTML without an entry', async () => {
    const { assets } = await compile({
      config: { entry: {} },
    });

    expect(assets['index.html']).toContain('<body>');
  });

  it('supports Rspack output modules', async () => {
    const { assets } = await compile({
      config: {
        experiments: { outputModule: true },
        output: { module: true },
      },
    });

    expect(assets['index.html']).toContain('src="main.js"');
  });

  it('exposes all hooks in execution order and allows mutations', async () => {
    const calls = [];
    const expectedCalls = [
      'beforeAssetTagGeneration',
      'alterAssetTags',
      'alterAssetTagGroups',
      'afterTemplateExecution',
      'beforeEmit',
      'afterEmit',
    ];
    let emittedOutput;
    const hookPlugin = {
      apply(compiler) {
        compiler.hooks.compilation.tap('HookTest', (compilation) => {
          const hooks = HtmlRspackPlugin.getCompilationHooks(compilation);

          for (const name of Object.keys(hooks)) {
            hooks[name].tap('HookTest', (data) => {
              calls.push(name);

              if (name === 'beforeAssetTagGeneration') {
                data.assets.js.push('extra.js');
              } else if (name === 'alterAssetTags') {
                data.assetTags.scripts[0].attributes.crossorigin = true;
              } else if (name === 'afterTemplateExecution') {
                data.bodyTags.push(
                  HtmlRspackPlugin.createHtmlTagObject('script', {
                    src: 'hook.js',
                  }),
                );
              } else if (name === 'beforeEmit') {
                data.html += '<!-- modified -->';
              } else if (name === 'afterEmit') {
                emittedOutput = data.outputName;
              }

              return data;
            });
          }
        });
      },
    };

    const { assets } = await compile({
      config: { plugins: [hookPlugin] },
    });
    const html = assets['index.html'];

    expect(calls).toEqual(expectedCalls);
    expect(emittedOutput).toBe('index.html');
    expect(html).toContain('crossorigin');
    expect(html).toContain('src="extra.js"');
    expect(html).toContain('src="hook.js"');
    expect(html).toContain('<!-- modified -->');
  });
});
