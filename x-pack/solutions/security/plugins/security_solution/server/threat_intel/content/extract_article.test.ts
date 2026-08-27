/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractArticleHtml } from './extract_article';
import { stripHtml } from './text';

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

  // `noscript` was in this list and is not chrome: it is reader-visible fallback, which
  // `text.ts` keeps for that reason, so stripping it here made the two stages disagree and
  // an article serving its body as fallback reached `stripHtml` empty. `form` stays.
  it('strips <form> but keeps <noscript>', () => {
    const html = `
      <article>
        <form action="/search"><input name="q" /><button>Search</button></form>
        <noscript>Please enable JavaScript</noscript>
        <p>Threat actor pivot: 203.0.113.0</p>
      </article>
    `;
    const result = extractArticleHtml(html);
    expect(result).not.toContain('/search');
    expect(result).toContain('Please enable JavaScript');
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

// Deeply nested markup used to crash extraction outright, at two separate recursive sites
// inside libraries (domhandler's `cloneNode`, parse5's serializer), both reachable in well
// under 10KB of input.
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
    // A truthy non-string reaches the parser and throws TypeError. The fallback is scoped to
    // RangeError, so a real programming error still surfaces instead of being reported as a
    // page that could not be simplified.
    expect(() => extractArticleHtml({} as unknown as string)).toThrow(TypeError);
  });
});

// Timing bounds are roughly 100x the measured cost, so they're not CI-flaky, but the
// quadratic behavior they replaced overruns them by orders of magnitude.
describe('hostile markup stays cheap', () => {
  const within = (budgetMs: number, fn: () => string): string => {
    const started = process.hrtime.bigint();
    const result = fn();
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(budgetMs);
    return result;
  };

  // parse5's tree construction is quadratic in depth, and it ran before any output-side
  // guard could help: 433ms at 10,000 nested elements and 2.2s at 20,000.
  it('does not pay a quadratic parse on deeply nested markup', () => {
    const input = `<html><body><article>${'<div>'.repeat(100000)}evil.test</article></body></html>`;

    expect(within(5000, () => extractArticleHtml(input))).toContain('evil.test');
  });

  // Overlapping candidates each got their own subtree traversal: 770ms from 14KB of
  // input at 1,600 nested `<article>` elements. The depth guard alone does not cover
  // this, since candidates can overlap well inside the depth bound.
  it('scores overlapping candidates without rescanning their subtrees', () => {
    const filler = '<p>lorem ipsum dolor sit amet consectetur adipiscing elit</p>';
    const nested = Array.from({ length: 250 }, () => `<article>${filler}`).join('');
    const input = `<html><body>${nested}evil.test</body></html>`;

    expect(within(5000, () => extractArticleHtml(input))).toContain('evil.test');
  });

  // A page past the depth bound is returned unsimplified rather than being processed
  // slowly or dropped. What must not happen is losing the content.
  it('returns a page past the depth bound unsimplified rather than empty', () => {
    const input = `<html><body><article>${'<div>'.repeat(1000)}evil.test</article></body></html>`;
    const result = extractArticleHtml(input);

    expect(result).toContain('evil.test');
  });

  it('still simplifies a page just inside the depth bound', () => {
    const input = `<html><body><header>site nav</header><article>${'<div>'.repeat(
      100
    )}evil.test</article><footer>foot</footer></body></html>`;
    const result = extractArticleHtml(input);

    expect(result).toContain('evil.test');
    expect(result).not.toContain('site nav');
    expect(result).not.toContain('foot');
  });
});

// HTML has no self-closing syntax for raw-text elements, so a spec-compliant parser reads
// `<script src="x.js"/>` as a script whose body is everything after it.
describe('self-closed raw-text elements', () => {
  it('keeps the report following a self-closed script', () => {
    const result = extractArticleHtml(
      '<html><body><article><script src="x.js"/><p>IOC: evil.test</p></article></body></html>'
    );

    expect(result).toContain('evil.test');
  });

  it('keeps the report following a self-closed style', () => {
    const result = extractArticleHtml(
      '<html><body><article><style/><p>IOC: evil.test</p></article></body></html>'
    );

    expect(result).toContain('evil.test');
  });

  it('still removes a properly terminated script from the article', () => {
    const result = extractArticleHtml(
      '<html><body><article><script>var tracker = 1;</script><p>IOC: evil.test</p></article></body></html>'
    );

    expect(result).toContain('evil.test');
    expect(result).not.toContain('tracker');
  });
});

// `$container.find(selectorList)` is quadratic in the container's child count; the same
// selector list evaluated from the document root is linear, which is why chrome is removed
// document-wide before the container is chosen.
describe('chrome removal cost', () => {
  it('does not go quadratic in the container child count', () => {
    const input = `<html><body><article>${'<b>x</b>'.repeat(
      200000
    )}<nav>menu</nav></article></body></html>`;

    const started = process.hrtime.bigint();
    const result = extractArticleHtml(input);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(5000);
    expect(result).not.toContain('menu');
    expect(result).toContain('x');
  });

  it('stays linear in the number of candidates', () => {
    const input = `<html><body>${'<article>x</article>'.repeat(80000)}</body></html>`;

    const started = process.hrtime.bigint();
    extractArticleHtml(input);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(3000);
  });
});

// The two stages have to agree about what the document contains — `text.ts` recognizes
// CDATA, so this file must too, or a CDATA body serializes back out as a comment.
describe('CDATA survives article extraction', () => {
  it('keeps a CDATA article body through extraction', () => {
    const extracted = extractArticleHtml(
      '<html><body><article><![CDATA[<p>IOC: evil.test</p>]]></article></body></html>'
    );

    expect(stripHtml(extracted)).toBe('IOC: evil.test');
  });
});

/**
 * Selectors can't see inside a CDATA node, so a teaser whose CDATA held a large script
 * bundle could outscore the real report during selection, then collapse to almost nothing
 * once `stripHtml` expanded the CDATA and dropped the script — losing the real indicator.
 */
describe('a teaser inflated by disappearing markup does not win selection', () => {
  const BUNDLE = 'var x=1;'.repeat(4000);

  // Counting bytes in the DOM was wrong the same way for each of these: markup that the
  // downstream stage strips still inflated the candidate, so a teaser beat the real report
  // and then collapsed to a few characters, losing every indicator. Scoring with `stripHtml`
  // covers all of them, and any representation it learns to strip later.
  it.each([
    ['a CDATA script', `<article><![CDATA[<script>${BUNDLE}</script>teaser]]></article>`],
    ['an entity-encoded script', `<article>&lt;script&gt;${BUNDLE}&lt;/script&gt;teaser</article>`],
    ['an entity-encoded style', `<article>&lt;style&gt;${BUNDLE}&lt;/style&gt;teaser</article>`],
    ['an ordinary script', `<article><script>${BUNDLE}</script>teaser</article>`],
  ])('prefers the real report over a teaser inflated by %s', (_label, teaser) => {
    const page = `<html><body>${teaser}<main><p>actual report with evil.test</p></main></body></html>`;

    const result = stripHtml(extractArticleHtml(page));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('var x=1');
  });

  // Precise scoring is one parse per candidate, so it is bounded. These shapes take the
  // fallback path and must stay cheap rather than correct.
  it.each([
    ['many candidates', `<html><body>${'<article>x</article>'.repeat(80000)}</body></html>`],
    [
      'many children',
      `<html><body><article>${'<b>x</b>'.repeat(200000)}<nav>m</nav></article></body></html>`,
    ],
  ])('stays cheap on %s', (_label, page) => {
    const started = process.hrtime.bigint();
    extractArticleHtml(page);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(5000);
  });

  it('still keeps a CDATA article body that is the real content', () => {
    const extracted = extractArticleHtml(
      '<html><body><article><![CDATA[<p>IOC: evil.test</p>]]></article></body></html>'
    );

    expect(stripHtml(extracted)).toBe('IOC: evil.test');
  });
});

// `noscript` is reader-visible fallback, not chrome — same rule `text.ts` applies.
describe('noscript is not chrome', () => {
  it('keeps an article body served as noscript fallback', () => {
    const result = stripHtml(
      extractArticleHtml(
        '<html><body><article><noscript><p>IOC: c2.evil.test</p></noscript></article></body></html>'
      )
    );

    expect(result).toBe('IOC: c2.evil.test');
  });

  it('still removes real chrome from the same article', () => {
    const result = stripHtml(
      extractArticleHtml(
        '<html><body><article><nav>menu</nav><script>t=1</script><p>IOC: evil.test</p></article></body></html>'
      )
    );

    expect(result).toBe('IOC: evil.test');
  });
});

describe('CDATA stays opaque through article extraction', () => {
  it('extracts a CDATA article body', () => {
    expect(
      stripHtml(
        extractArticleHtml(
          '<html><body><article><![CDATA[<p>IOC: evil.test</p>]]></article></body></html>'
        )
      )
    ).toBe('IOC: evil.test');
  });
});

/**
 * Scoring calls `stripHtml`, so a hidden subtree that never reaches a reader must not inflate a
 * candidate. One holding a large hidden block could otherwise outscore the real report.
 */
describe('hidden subtrees do not inflate candidate scores', () => {
  it('prefers the real report over a teaser inflated by hidden text', () => {
    const page =
      `<html><body><article><div hidden>${'x '.repeat(20000)}</div>teaser</article>` +
      '<main><p>report evil.test</p></main></body></html>';

    expect(stripHtml(extractArticleHtml(page))).toContain('evil.test');
  });
});

// Page-level chrome is removed only when a narrower container wins — removing it before
// selection would lose report content on any page with no article container at all.
describe('page-level chrome and the body fallback', () => {
  it.each([
    [
      'a body header',
      '<html><body><header><p>IOC: c2.evil.test</p></header><div>details</div></body></html>',
    ],
    [
      'a body aside',
      '<html><body><aside><p>IOC: c2.evil.test</p></aside><div>details</div></body></html>',
    ],
  ])('keeps report content in %s when no container matches', (_label, html) => {
    const result = stripHtml(extractArticleHtml(html));

    expect(result).toContain('c2.evil.test');
    expect(result).toContain('details');
  });

  it('still removes page chrome when a container wins', () => {
    const result = stripHtml(
      extractArticleHtml(
        '<html><body><header>site nav</header><article><p>report evil.test</p></article><footer>foot</footer></body></html>'
      )
    );

    expect(result).toBe('report evil.test');
  });
});

describe('the body fallback preserves wrapper render state', () => {
  it.each([
    ['the hidden attribute', '<body hidden>c2.stale.test</body>'],
    ['display:none', '<body style="display:none">c2.stale.test</body>'],
    ['a hidden html ancestor', '<html hidden><body>c2.stale.test</body></html>'],
    [
      'a display:none html ancestor',
      '<html style="display:none"><body>c2.stale.test</body></html>',
    ],
  ])('drops a body hidden by %s', (_label, html) => {
    expect(stripHtml(extractArticleHtml(html))).toBe('');
  });

  it('keeps a visible descendant of a visibility:hidden body', () => {
    const result = stripHtml(
      extractArticleHtml(
        '<body style="visibility:hidden">c2.stale.test<span style="visibility:visible">real.test</span></body>'
      )
    );

    expect(result).toBe('real.test');
  });

  it('keeps a visible descendant of a visibility:hidden html ancestor', () => {
    const result = stripHtml(
      extractArticleHtml(
        '<html style="visibility:hidden"><body>c2.stale.test<span style="visibility:visible">real.test</span></body></html>'
      )
    );

    expect(result).toBe('real.test');
  });
});

// A hidden candidate scores zero — neither scoring path can see the candidate's own
// `hidden` attribute on its own (precise scoring passes inner HTML, dropping the wrapper).
describe('hidden candidates cannot win selection', () => {
  const STALE = `${'stale '.repeat(3000)}c2.stale.test`;

  it.each([
    [
      'article',
      `<html><body><article hidden>${STALE}</article><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'main',
      `<html><body><main hidden>${STALE}</main><article><p>report evil.test</p></article></body></html>`,
    ],
    // Judged on the ancestor chain, not the element. Neither scoring path can see above the
    // candidate, so one under a hidden ancestor, or inside page-level chrome, has to be excluded
    // here or it competes on equal terms and its stale text is returned as the report. Removing
    // the ancestor after selection does not un-select an already-detached container.
    [
      'article under a hidden ancestor',
      `<html><body><div hidden><article>${STALE}</article></div><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'article under a deep hidden ancestor',
      `<html><body><div hidden><div><div><article>${STALE}</article></div></div></div><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'article inside a body header',
      `<html><body><header><article>${STALE}</article></header><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'article inside a body footer',
      `<html><body><footer><article>${STALE}</article></footer><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'article inside a body aside',
      `<html><body><aside><article>${STALE}</article></aside><main><p>report evil.test</p></main></body></html>`,
    ],
  ])('prefers the visible report over a hidden %s', (_label, html) => {
    const result = stripHtml(extractArticleHtml(html));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('c2.stale.test');
  });

  it('yields nothing when the only candidate is hidden', () => {
    expect(
      stripHtml(
        extractArticleHtml(
          '<html><body><article hidden>only hidden c2.stale.test</article></body></html>'
        )
      )
    ).toBe('');
  });
});

// The fallback scorer (used past 32 candidates or 2MB) has to discount hidden descendants
// too, or a teaser inflated by a hidden block beats the visible report.
describe('the fallback scorer discounts hidden descendants', () => {
  it('prefers the visible report when the fallback path is in use', () => {
    const teaser = `<article><div hidden>${'stale '.repeat(
      4000
    )}c2.stale.test</div>teaser</article>`;
    const page =
      `<html><body>${teaser}${'<article>x</article>'.repeat(32)}` +
      '<main><p>report evil.test</p></main></body></html>';

    const result = stripHtml(extractArticleHtml(page));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('c2.stale.test');
  });
});

describe('candidate enumeration counts each element once', () => {
  it('does not force the fallback scorer when elements match several selectors', () => {
    const classes = 'post-content article-content entry-content blog-post';
    const inflated = `&lt;script&gt;${'x'.repeat(1000)}&lt;/script&gt;teaser`;
    const decoys = Array.from(
      { length: 6 },
      (_, index) =>
        `<article role="main" class="${classes}">${index === 0 ? inflated : `d${index}`}</article>`
    ).join('');
    const page = `<html><body>${decoys}<main>${'actual report evil.test '.repeat(
      20
    )}</main></body></html>`;

    expect(stripHtml(extractArticleHtml(page))).toContain('actual report evil.test');
  });
});

describe('visibility overrides remain selectable', () => {
  it.each([
    ['the precise scorer', 0],
    ['the fallback scorer', 32],
  ])('keeps visible descendants of a visibility:hidden candidate with %s', (_label, decoyCount) => {
    const decoys = Array.from(
      { length: decoyCount },
      (_, index) => `<article>tiny decoy ${index}</article>`
    ).join('');
    const page = [
      '<html><body>',
      decoys,
      '<article style="visibility:hidden">stale.test',
      '<div style="visibility:visible">actual report evil.test with substantive content</div>',
      '</article>',
      '<main>short report</main>',
      '</body></html>',
    ].join('');

    expect(stripHtml(extractArticleHtml(page))).toContain('actual report evil.test');
  });
});

// `template` is non-rendered, like `hidden`, and selection has to know that — its inner
// HTML discards the wrapper that makes the contents inert.
describe('template subtrees cannot win selection', () => {
  const STALE = `${'stale '.repeat(1000)}c2.stale.test`;

  it.each([
    [
      'a template candidate',
      `<html><body><template class="post-content">${STALE}</template><main><p>report evil.test</p></main></body></html>`,
    ],
    [
      'a candidate inside a template',
      `<html><body><template><article>${STALE}</article></template><main><p>report evil.test</p></main></body></html>`,
    ],
  ])('prefers the visible report over %s', (_label, html) => {
    const result = stripHtml(extractArticleHtml(html));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('c2.stale.test');
  });

  // The fallback scorer needs the same rule, which is the path that took three rounds to cover
  // for `hidden`.
  it.each([
    ['a template', `<template>${'stale '.repeat(4000)}c2.stale.test</template>`],
    ['a hidden block', `<div hidden>${'stale '.repeat(4000)}c2.stale.test</div>`],
  ])('discounts %s on the fallback scoring path', (_label, block) => {
    const page =
      `<html><body><article>${block}teaser</article>${'<article>x</article>'.repeat(32)}` +
      '<main><p>report evil.test</p></main></body></html>';

    const result = stripHtml(extractArticleHtml(page));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('c2.stale.test');
  });
});

/**
 * Candidate scoring shares the non-rendered rule, so an iframe-heavy teaser must not outweigh the
 * visible report on either scoring path.
 */
describe('iframe contents do not inflate candidate scores', () => {
  it('prefers the visible report over a teaser inflated by an iframe', () => {
    const page =
      `<html><body><article><iframe>${'stale '.repeat(
        4000
      )}c2.stale.test</iframe>teaser</article>` +
      `${'<article>x</article>'.repeat(32)}<main><p>report evil.test</p></main></body></html>`;

    const result = stripHtml(extractArticleHtml(page));

    expect(result).toContain('evil.test');
    expect(result).not.toContain('c2.stale.test');
  });
});
