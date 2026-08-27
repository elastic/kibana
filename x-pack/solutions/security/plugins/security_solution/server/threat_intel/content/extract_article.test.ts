/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractArticleHtml } from './extract_article';
import { stripHtml } from './text';

const extractedText = (html: string): string => stripHtml(extractArticleHtml(html));

describe('extractArticleHtml', () => {
  it('returns empty input and rejects a programming error', () => {
    expect(extractArticleHtml('')).toBe('');
    expect(() => extractArticleHtml({} as unknown as string)).toThrow(TypeError);
  });

  it.each([
    ['article', '<article><p>safe.test</p></article>', 'safe.test'],
    ['main', '<main><p>safe.test</p></main>', 'safe.test'],
    ['main role', '<div role="main"><p>safe.test</p></div>', 'safe.test'],
    ['content class', '<div class="post-content"><p>safe.test</p></div>', 'safe.test'],
    ['body fallback', '<body><div><p>safe.test</p></div></body>', 'safe.test'],
    ['fragment fallback', '<description><p>safe.test</p></description>', 'safe.test'],
  ])('selects the %s content path', (_label, html, expected) => {
    expect(extractedText(html)).toBe(expected);
  });

  it('removes unambiguous chrome while preserving article semantics', () => {
    const html = `
      <nav>false-nav.test</nav>
      <article>
        <header>Executive safe-header.test</header>
        <aside>Callout safe-aside.test</aside>
        <footer>Citation safe-footer.test</footer>
        <form>false-form.test</form>
        <div class="sidebar">false-sidebar.test</div>
        <noscript>safe-noscript.test</noscript>
        <code>safe-code.test</code>
        <table><tr><td>safe-table.test</td></tr></table>
      </article>`;
    const result = extractedText(html);
    expect(result).toContain('safe-header.test');
    expect(result).toContain('safe-aside.test');
    expect(result).toContain('safe-footer.test');
    expect(result).toContain('safe-noscript.test');
    expect(result).toContain('safe-code.test');
    expect(result).toContain('safe-table.test');
    expect(result).not.toContain('false-');
  });

  it('keeps page-level sections when only the body fallback exists', () => {
    const html =
      '<body><header>safe-header.test</header><aside>safe-aside.test</aside><div>safe.test</div></body>';
    expect(extractedText(html)).toBe('safe-header.test safe-aside.test safe.test');
  });
});

describe('article candidate selection', () => {
  it.each([
    [
      '<article>teaser</article><main><p>Substantive report with IOC safe.test</p></main>',
      'safe.test',
    ],
    [
      '<article>short</article><article><p>Long substantive report safe.test</p></article>',
      'safe.test',
    ],
    [
      '<article><script>very long false.test '.concat(
        'x'.repeat(1000),
        '</script>teaser</article><main>safe.test report</main>'
      ),
      'safe.test',
    ],
    [
      '<article><div class="sidebar">'.concat(
        'false.test '.repeat(100),
        '</div>teaser</article><main>safe.test report</main>'
      ),
      'safe.test',
    ],
  ])('chooses the substantive visible candidate', (html, expected) => {
    const result = extractedText(html);
    expect(result).toContain(expected);
    expect(result).not.toContain('false.test');
  });

  it.each([
    ['hidden attribute', 'hidden'],
    ['display none', 'style="display:none"'],
    ['variable fallback', 'style="display:var(--missing, none)"'],
  ])('does not let a %s candidate win', (_label, attribute) => {
    const html =
      `<article ${attribute}>${'false.test '.repeat(100)}</article>` +
      '<main>Visible report safe.test</main>';
    expect(extractedText(html)).toBe('Visible report safe.test');
  });

  it.each([
    ['template', '<template>'.concat('false.test '.repeat(100), '</template>')],
    ['iframe', '<iframe>'.concat('false.test '.repeat(100), '</iframe>')],
  ])('does not score a %s subtree as report text', (_label, hidden) => {
    const html = `<article>${hidden}teaser</article><main>Visible report safe.test</main>`;
    expect(extractedText(html)).toBe('Visible report safe.test');
  });

  it('keeps a candidate whose descendant restores visibility', () => {
    const html =
      '<article style="visibility:hidden">false.test' +
      '<div style="visibility:visible">Visible report safe.test</div></article>' +
      '<main>short</main>';
    expect(extractedText(html)).toBe('Visible report safe.test');
  });

  it('deduplicates a candidate matching several selectors', () => {
    const distractors = Array.from(
      { length: 31 },
      (_, index) => `<article>card ${index}</article>`
    ).join('');
    const html =
      `${distractors}<article role="main" class="post-content article-content entry-content blog-post">` +
      `Substantive report safe.test</article>`;
    expect(extractedText(html)).toContain('safe.test');
  });
});

describe('parser compatibility and degradation', () => {
  it.each([
    '<article><script src="x.js"/><p>safe.test</p></article>',
    '<article><style/><p>safe.test</p></article>',
    '<article><script>false.test</script/><p>safe.test</p></article>',
  ])('keeps report content after a supported raw-text boundary', (html) => {
    expect(extractedText(html)).toBe('safe.test');
  });

  it('keeps a CDATA article body for the downstream parser', () => {
    const html = '<article><![CDATA[<h2>IOCs</h2><p>safe.test</p>]]></article>';
    expect(extractedText(html)).toContain('safe.test');
  });

  it('walks nesting that would exhaust a recursive clone', () => {
    const html = `${'<div>'.repeat(2_000)}<article>safe.test</article>${'</div>'.repeat(2_000)}`;
    expect(extractedText(html)).toContain('safe.test');
  });

  it('returns overly deep input unsimplified instead of failing', () => {
    const html = `${'<div>'.repeat(6_000)}safe.test${'</div>'.repeat(6_000)}`;
    expect(extractArticleHtml(html)).toBe(html);
  });

  it('keeps wide chrome removal bounded', () => {
    const html = `<article>${'<span>x</span>'.repeat(50_000)}<p>safe.test</p></article>`;
    const started = process.hrtime.bigint();
    expect(extractedText(html)).toContain('safe.test');
    expect(Number(process.hrtime.bigint() - started) / 1e6).toBeLessThan(5_000);
  });

  it('keeps overlapping candidate scoring bounded', () => {
    const html = `${'<article>'.repeat(1_000)}safe.test${'</article>'.repeat(1_000)}`;
    const started = process.hrtime.bigint();
    expect(extractedText(html)).toContain('safe.test');
    expect(Number(process.hrtime.bigint() - started) / 1e6).toBeLessThan(5_000);
  });
});
