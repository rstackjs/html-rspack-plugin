import { Buffer } from 'node:buffer';
import { describe, expect, it } from '@rstest/core';
import { HtmlRspackPlugin } from './helpers/compile.js';

const compiler = {
  options: {
    mode: 'development',
  },
};

function createTag(tagName, attributes, innerHTML) {
  return {
    tagName,
    voidTag: tagName.toLowerCase() === 'meta',
    attributes: attributes || {},
    innerHTML: innerHTML || '',
    meta: {},
  };
}

function postProcessHtml(html, headTags, options) {
  const plugin = new HtmlRspackPlugin({ inject: true, ...options });

  return plugin.postProcessHtml(
    compiler,
    html,
    { publicPath: '', js: [], css: [] },
    { headTags, bodyTags: [] },
  );
}

describe('HtmlRspackPlugin HTML post processing', () => {
  it('injects a generated charset at the start of head and within the first 1024 bytes', async () => {
    const longHeadContent = '你好'.repeat(300);
    const html = `<!doctype html><html><head>${longHeadContent}</head><body></body></html>`;
    const output = await postProcessHtml(html, [
      createTag('meta', { charset: 'UTF-8' }),
      createTag('script', { src: 'main.js' }),
    ]);
    const charsetMatch = /<meta charset="UTF-8">/.exec(output);

    expect(charsetMatch).not.toBeNull();
    expect(output).toContain('<head><meta charset="UTF-8">');
    expect(output).toContain('<script src="main.js"></script></head>');
    expect(
      Buffer.byteLength(
        output.slice(0, charsetMatch.index + charsetMatch[0].length),
      ),
    ).toBeLessThanOrEqual(1024);
  });

  it('ignores head tags inside comments', async () => {
    const html = '<!-- <head> --><html><head></head><body></body></html>';
    const output = await postProcessHtml(html, [
      createTag('meta', { charset: 'UTF-8' }),
    ]);

    expect(output).toBe(
      '<!-- <head> --><html><head><meta charset="UTF-8"></head><body></body></html>',
    );
  });

  it('handles greater-than signs inside head attributes', async () => {
    const html = '<html><head data-value=">"></head><body></body></html>';
    const output = await postProcessHtml(html, [
      createTag('meta', { charset: 'UTF-8' }),
    ]);

    expect(output).toBe(
      '<html><head data-value=">"><meta charset="UTF-8"></head><body></body></html>',
    );
  });

  it('creates a head before injecting a generated charset', async () => {
    const output = await postProcessHtml(
      '<!doctype html><html><body></body></html>',
      [
        createTag('meta', { charset: 'UTF-8' }),
        createTag('script', { src: 'main.js' }),
      ],
    );

    expect(output).toBe(
      '<!doctype html><html><head><meta charset="UTF-8"><script src="main.js"></script></head><body></body></html>',
    );
  });
});
