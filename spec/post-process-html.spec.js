/*
 * Unit tests for automatic tag injection during HTML post processing
 */

/* eslint-env jest */
'use strict';

const HtmlRspackPlugin = require('../lib/index.js');

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

  it('keeps a charset authored by the template without injecting a duplicate', async () => {
    const templateCharset = '<META data-origin="template" CHARSET="utf-8">';
    const html = `<html><head>${templateCharset}</head><body></body></html>`;
    const output = await postProcessHtml(html, [
      createTag('meta', { charset: 'UTF-8' }),
      createTag('script', { src: 'main.js' }),
    ]);

    expect(output).toContain(templateCharset);
    expect(output.match(/<meta\b[^>]*\bcharset\s*=/gi)).toHaveLength(1);
    expect(output).toContain('<script src="main.js"></script></head>');
  });

  it('does not mistake charset text in another attribute for a declaration', async () => {
    const html =
      '<html><head><meta content="charset=not-a-declaration"></head><body></body></html>';
    const output = await postProcessHtml(html, [
      createTag('meta', { charset: 'UTF-8' }),
    ]);

    expect(output).toContain(
      '<head><meta charset="UTF-8"><meta content="charset=not-a-declaration">',
    );
  });

  it('recognizes and deduplicates case-insensitive charset tags in the final head tag list', async () => {
    const output = await postProcessHtml(
      '<html><head></head><body></body></html>',
      [
        createTag('META', { CHARSET: 'UTF-8' }),
        createTag('meta', { charset: 'iso-8859-1' }),
      ],
    );

    expect(output).toContain('<head><META CHARSET="UTF-8">');
    expect(output.match(/<meta\b[^>]*\bcharset\s*=/gi)).toHaveLength(1);
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

  it('does not inject a generated charset when injection is disabled', async () => {
    const html = '<html><head></head><body></body></html>';
    const output = await postProcessHtml(
      html,
      [createTag('meta', { charset: 'UTF-8' })],
      { inject: false },
    );

    expect(output).toBe(html);
  });
});
