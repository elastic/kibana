/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readability } from '@mozilla/readability';

import { extractArticleHtml } from './extract_article';
import { stripHtml } from './text';

const extractedText = (html: string): string => stripHtml(extractArticleHtml(html));
const reportParagraph =
  'Researchers observed a sustained intrusion campaign, with multiple command and control domains, credential theft, and lateral movement across the affected network.';

describe('extractArticleHtml', () => {
  it('returns empty input and rejects a programming error', () => {
    expect(extractArticleHtml('')).toBe('');
    expect(() => extractArticleHtml({} as unknown as string)).toThrow(TypeError);
  });

  it('uses Readability to select the report instead of a teaser', () => {
    const html = `
      <aside class="sidebar"><p>Short teaser false.test</p></aside>
      <main><article><h1>Threat report</h1>
        <p>${reportParagraph.repeat(4)} safe.test</p>
        <p>${reportParagraph.repeat(4)}</p>
      </article></main>`;
    const result = extractedText(html);
    expect(result).toContain('safe.test');
    expect(result).not.toContain('false.test');
  });

  it('preserves semantic elements owned by the selected article', () => {
    const html = `<article>
      <header>Executive safe-header.test</header>
      <p>${reportParagraph.repeat(6)}</p>
      <code>safe-code.test</code>
      <table><tr><td>safe-table.test</td></tr></table>
    </article>`;
    const result = extractedText(html);
    expect(result).toContain('safe-header.test');
    expect(result).toContain('safe-code.test');
    expect(result).toContain('safe-table.test');
  });

  it('accepts a short article and falls back for empty content', () => {
    expect(extractedText('<article><p>Brief safe.test report.</p></article>')).toContain(
      'safe.test'
    );
    expect(extractArticleHtml('<body><div></div></body>')).toBe('<div></div>');
  });

  it('falls back to the normalized body when Readability reaches its element bound', () => {
    const html = '<i>x</i>'.repeat(100_001);
    expect(extractArticleHtml(html)).toBe(html);
  });

  it('falls back when Readability returns an article without visible text', () => {
    const parse = jest.spyOn(Readability.prototype, 'parse').mockReturnValueOnce({
      byline: null,
      content: '<article></article>',
      dir: null,
      excerpt: null,
      lang: null,
      length: 0,
      publishedTime: null,
      siteName: null,
      textContent: '',
      title: '',
    });
    try {
      expect(extractArticleHtml('<p>safe.test</p>')).toBe('<p>safe.test</p>');
    } finally {
      parse.mockRestore();
    }
  });

  it('does not resolve relative links through an attacker-controlled base URL', () => {
    const html = `
      <base href="https://attacker.test/root/">
      <article><h1>Threat report</h1><p>${reportParagraph.repeat(6)}</p>
        <a href="/indicators/evil.test">Indicator details</a>
      </article>`;
    const extracted = extractArticleHtml(html);
    expect(extracted).toContain('href="/indicators/evil.test"');
    expect(extracted).not.toContain('attacker.test');
  });

  it('keeps scripts and resource loading inert', () => {
    const html = `
      <script>document.querySelector('article').textContent = 'executed.test'</script>
      <img src="https://should-not-load.test/image.png">
      <article><p>${reportParagraph.repeat(6)} safe.test</p></article>`;
    const result = extractedText(html);
    expect(result).toContain('safe.test');
    expect(result).not.toContain('executed.test');
  });

  it('preserves reader-visible noscript fallback content', () => {
    const html = `<noscript><article><p>${reportParagraph.repeat(
      6
    )} safe.test</p></article></noscript>`;
    expect(extractedText(html)).toContain('safe.test');
  });

  it('does not let accessibility metadata hide visually rendered report content', () => {
    const html = `<article aria-hidden="true"><p>${reportParagraph.repeat(
      6
    )} safe.test</p></article>`;
    expect(extractedText(html)).toContain('safe.test');
  });

  it('normalizes hidden content before article selection', () => {
    const html = `
      <article hidden>${'false.test '.repeat(100)}</article>
      <main><p>${reportParagraph.repeat(6)} safe.test</p></main>`;
    expect(extractedText(html)).toContain('safe.test');
  });

  it('preserves a descendant that restores inherited visibility', () => {
    const html = `<article style="visibility:hidden">false.test
      <div style="visibility:visible">${reportParagraph.repeat(6)} safe.test</div>
    </article>`;
    const result = extractedText(html);
    expect(result).toContain('safe.test');
    expect(result).not.toContain('false.test');
  });
});
