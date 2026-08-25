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
