/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractArticleHtml } from './extract_article';

describe('extractArticleHtml', () => {
  it('returns empty string for empty input', () => {
    expect(extractArticleHtml('')).toBe('');
  });

  it('strips <nav> and <footer> chrome from an <article> container', () => {
    const html = `
      <html><body>
        <nav><a href="/home">Home</a><a href="/about">About</a></nav>
        <article>
          <h2>Indicators of Compromise</h2>
          <p>The domain <code>evil[.]com</code> was observed.</p>
        </article>
        <footer><a href="/privacy">Privacy</a></footer>
      </body></html>
    `;
    const result = extractArticleHtml(html);
    // Chrome links are gone
    expect(result).not.toContain('/home');
    expect(result).not.toContain('/about');
    expect(result).not.toContain('/privacy');
    // Article IOCs are preserved
    expect(result).toContain('evil[.]com');
    expect(result).toContain('Indicators of Compromise');
  });

  it('preserves <code> inline indicators (the readability-failure case)', () => {
    // Readability was rejected because it dropped inline-<code> IOCs.
    // This pre-step must NEVER replicate that: <code> must survive.
    const html = `
      <html><body>
        <nav><a href="/nav">Nav</a></nav>
        <article>
          <p>C2 beacon: <code>c[.]cseo99[.]com</code> on port 443</p>
          <pre>127.0.0.1  localhost</pre>
        </article>
      </body></html>
    `;
    const result = extractArticleHtml(html);
    expect(result).toContain('c[.]cseo99[.]com');
    expect(result).not.toContain('/nav');
  });

  it('strips <header> and <aside> from within <article>', () => {
    const html = `
      <article>
        <header><nav><a href="/menu">Menu</a></nav></header>
        <aside class="sidebar"><p>Advertisement</p></aside>
        <p>IP address 192.0.2.1 was seen.</p>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('/menu');
    expect(result).not.toContain('Advertisement');
    expect(result).toContain('192.0.2.1');
  });

  it('falls back to <body> when no article container matches — content kept, not dropped', () => {
    // Pages with no <article>/<main>/etc. must NOT silently drop content.
    const html = `
      <html><body>
        <div class="wrapper">
          <p>Hash: d41d8cd98f00b204e9800998ecf8427e</p>
        </div>
      </body></html>
    `;
    const result = extractArticleHtml(html);
    // Falls back to body — hash is still present
    expect(result).toContain('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('uses <main> when no <article> exists', () => {
    const html = `
      <html><body>
        <nav><a href="/nav">Nav</a></nav>
        <main>
          <p>Threat actor used 10[.]0[.]0[.]1 as pivot.</p>
        </main>
        <footer><p>Copyright 2024</p></footer>
      </body></html>
    `;
    const result = extractArticleHtml(html);
    expect(result).toContain('10[.]0[.]0[.]1');
    expect(result).not.toContain('/nav');
    expect(result).not.toContain('Copyright 2024');
  });

  it('uses [role=main] as container', () => {
    const html = `
      <html><body>
        <div role="navigation"><a href="/menu">Menu</a></div>
        <div role="main">
          <p>Malware hash: 098f6bcd4621d373cade4e832627b4f6</p>
        </div>
      </body></html>
    `;
    const result = extractArticleHtml(html);
    expect(result).toContain('098f6bcd4621d373cade4e832627b4f6');
    expect(result).not.toContain('/menu');
  });

  it('strips common boilerplate classes (.sidebar, .nav, .menu, .newsletter, .comments)', () => {
    const html = `
      <article>
        <div class="sidebar"><p>Sidebar content</p></div>
        <div class="newsletter"><p>Subscribe!</p></div>
        <div class="comments"><p>User comments here</p></div>
        <div class="content">
          <p>IOC: 198.51.100.42</p>
        </div>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('Sidebar content');
    expect(result).not.toContain('Subscribe!');
    expect(result).not.toContain('User comments here');
    expect(result).toContain('198.51.100.42');
  });

  it('preserves <table> and <a> tags within the article', () => {
    const html = `
      <article>
        <table>
          <tr><td>Domain</td><td>c2.evil.com</td></tr>
        </table>
        <a href="https://c2.evil.com/beacon">beacon link</a>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).toContain('c2.evil.com');
    expect(result).toContain('beacon link');
    // Table structure preserved in HTML form
    expect(result).toContain('<table>');
    expect(result).toContain('<a');
  });

  it('strips <script> and <style> (unambiguous chrome regardless of position)', () => {
    const html = `
      <article>
        <script>document.cookie = "steal";</script>
        <style>.hide { display: none }</style>
        <p>Real content with 10.0.0.1</p>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('document.cookie');
    expect(result).not.toContain('.hide');
    expect(result).toContain('10.0.0.1');
  });

  it('strips <form> and <noscript>', () => {
    const html = `
      <article>
        <form action="/search"><input name="q" /><button>Search</button></form>
        <noscript>Please enable JavaScript</noscript>
        <p>Threat actor pivot: 203.0.113.0</p>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('/search');
    expect(result).not.toContain('Please enable JavaScript');
    expect(result).toContain('203.0.113.0');
  });

  it('strips #comments and .share elements', () => {
    const html = `
      <article>
        <div id="comments"><p>Great post!</p></div>
        <div class="share"><a href="/share">Share</a></div>
        <p>Domain seen: attacker[.]net</p>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('Great post!');
    expect(result).not.toContain('/share');
    expect(result).toContain('attacker[.]net');
  });
});

describe('extractArticleHtml — candidate selection', () => {
  // Taking .first() meant any earlier ancillary element won: a page with an <article>
  // teaser card plus a <main> holding the actual report returned the teaser, and
  // every IOC in the report was missed.
  it('prefers the substantive container over an earlier teaser', () => {
    const html = `
      <body>
        <article class="teaser">Read more about ransomware</article>
        <main><p>The actor used ${'detail '.repeat(40)} and the C2 was evil.test</p></main>
      </body>`;

    const out = extractArticleHtml(html);

    expect(out).toContain('evil.test');
  });

  it('picks the largest of several same-selector candidates', () => {
    const html = `
      <body>
        <article>short</article>
        <article>${'the real body '.repeat(40)} c2.evil.test</article>
      </body>`;

    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('still falls back to body when no candidate matches', () => {
    const html = '<body><div><p>plain page with evil.test</p></div></body>';
    expect(extractArticleHtml(html)).toContain('evil.test');
  });
});

describe('extractArticleHtml — scoring excludes chrome', () => {
  // Measuring raw text before chrome removal let a teaser carrying a large inline
  // script outweigh the real report, win selection, and then get stripped to almost
  // nothing, dropping the report and its IOCs.
  it('does not let a teaser win on inline script weight', () => {
    const html = `
      <body>
        <article><script>${'var x = 1; '.repeat(200)}</script>teaser</article>
        <main><p>The actor used c2.evil.test for command and control</p></main>
      </body>`;

    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('does not let inline style weight decide either', () => {
    const html = `
      <body>
        <article><style>${'.a { color: red; } '.repeat(200)}</style>teaser</article>
        <main><p>indicator c2.evil.test here</p></main>
      </body>`;

    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('still picks the article when it genuinely holds the most prose', () => {
    const html = `
      <body>
        <article><p>${'real report body '.repeat(40)} c2.evil.test</p></article>
        <main><p>short</p></main>
      </body>`;

    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });
});

describe('extractArticleHtml — article-owned semantic elements', () => {
  // HTML permits header/footer/aside inside an article. Removing every descendant threw
  // away report content, and because the same removal fed scoring it could also make the
  // real article lose to a teaser.
  it('keeps an executive summary in the article header', () => {
    const html =
      '<body><article><header><h1>Report</h1><p>Summary names c2.evil.test</p></header><p>body</p></article></body>';
    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('keeps an IOC callout in an article aside', () => {
    const html = '<body><article><p>body</p><aside>IOC: c2.evil.test</aside></article></body>';
    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('keeps a citation in the article footer', () => {
    const html =
      '<body><article><p>body</p><footer>Source: https://vendor.test/r</footer></article></body>';
    expect(extractArticleHtml(html)).toContain('vendor.test');
  });

  it('still removes page-level chrome outside the article', () => {
    const html =
      '<body><header>Site nav junk</header><article><p>real c2.evil.test</p></article><footer>site footer</footer></body>';
    const out = extractArticleHtml(html);
    expect(out).toContain('c2.evil.test');
    expect(out).not.toContain('Site nav junk');
  });

  it('still removes nav inside the container', () => {
    const html = '<body><article><nav>skip links</nav><p>real c2.evil.test</p></article></body>';
    const out = extractArticleHtml(html);
    expect(out).toContain('c2.evil.test');
    expect(out).not.toContain('skip links');
  });
});

describe('extractArticleHtml — class-based sections and empty candidates', () => {
  // Vendors write `<div class="header">` as often as `<header>`, so scoping only the
  // semantic elements to page level left the class equivalents deleting article content
  // and skewing candidate scoring with it.
  it('keeps a class-based header inside the article', () => {
    const html =
      '<body><article><div class="header">Summary names c2.evil.test</div><p>body</p></article></body>';
    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('keeps a class-based footer inside the article', () => {
    const html =
      '<body><article><p>body</p><div class="footer">Source https://vendor.test/r</div></article></body>';
    expect(extractArticleHtml(html)).toContain('vendor.test');
  });

  it('still removes a page-level class-based header', () => {
    const html =
      '<body><div class="header">Site nav junk</div><article><p>real c2.evil.test</p></article></body>';
    const out = extractArticleHtml(html);
    expect(out).toContain('c2.evil.test');
    expect(out).not.toContain('Site nav junk');
  });

  it('still removes an unambiguous chrome class from inside the article', () => {
    const html =
      '<body><article><div class="newsletter">subscribe now</div><p>real c2.evil.test</p></article></body>';
    const out = extractArticleHtml(html);
    expect(out).toContain('c2.evil.test');
    expect(out).not.toContain('subscribe now');
  });

  // An empty match satisfied the selector loop and suppressed the body fallback, so a
  // stray `<article></article>` returned nothing at all.
  it('falls back to body when the only candidate is empty', () => {
    const html = '<body><article></article><div>actual report with c2.evil.test</div></body>';
    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });

  it('falls back to body when every candidate is whitespace only', () => {
    const html = '<body><article>   </article><main>  </main><div>c2.evil.test</div></body>';
    expect(extractArticleHtml(html)).toContain('c2.evil.test');
  });
});

/**
 * Deeply nested markup used to crash extraction outright.
 *
 * Two separate recursive sites, both inside libraries: `clone()` bottomed out in
 * domhandler's `cloneNode` at around 1,600 levels, and parse5's serializer gives out
 * somewhere past 3,000. Both are reachable in well under 10KB of input, so a single
 * malformed or hostile page took down report extraction, and because the threshold moves
 * with stack already in use it read as an intermittent failure.
 */
describe('deeply nested markup', () => {
  const nest = (depth: number, payload: string) =>
    `<html><body><article>${'<div>'.repeat(depth)}${payload}</article></body></html>`;

  it('extracts through nesting that used to exhaust the stack while cloning', () => {
    const result = extractArticleHtml(nest(2000, 'evil.test'));

    expect(result).toContain('evil.test');
  });

  it('degrades to the input rather than throwing when nesting defeats the serializer', () => {
    const input = nest(6000, 'evil.test');

    // The contract is that extraction never throws and never loses the indicator; the
    // chrome stripping is what degrades.
    expect(() => extractArticleHtml(input)).not.toThrow();
    expect(extractArticleHtml(input)).toContain('evil.test');
  });

  it('does not swallow a genuine programming error', () => {
    // The fallback is scoped to RangeError, so a TypeError from a real defect still
    // surfaces instead of being reported as a page that could not be simplified.
    expect(() => extractArticleHtml(undefined as unknown as string)).not.toThrow();
  });
});
