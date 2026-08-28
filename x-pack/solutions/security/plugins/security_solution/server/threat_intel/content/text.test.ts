/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReportContent, htmlToStructured, stripHtml, truncate } from './text';

describe('stripHtml', () => {
  it.each([
    [undefined, ''],
    [null, ''],
    ['', ''],
    ['<p>Hello <strong>world</strong></p>', 'Hello world'],
    ['<p>5 &lt; 10 and CVSS &gt; 7</p>', '5 < 10 and CVSS > 7'],
    ['<p>&copy;&nbsp;Acme &mdash; &ldquo;hello&rdquo;</p>', '© Acme — “hello”'],
    ['<p>one</p><!-- hidden.test --><p>two</p>', 'one two'],
  ])('extracts browser text from %j', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    '<div><script>false.test</script><p>safe.test</p></div>',
    '<div><style>.false{display:block}</style><p>safe.test</p></div>',
    '<script>false.test</script ><p>safe.test</p>',
    '<script>false.test</script\t><p>safe.test</p>',
    '<script>false.test</script\n><p>safe.test</p>',
    '<script>false.test</script\r><p>safe.test</p>',
    '<script>false.test</script\f><p>safe.test</p>',
    '<script>x</script\u00a0>false.test</script><p>safe.test</p>',
    '<script>x</scriptfoo>false.test</script><p>safe.test</p>',
  ])('uses browser raw-text boundaries for %j', (html) => {
    expect(stripHtml(html)).toBe('safe.test');
  });

  it.each([
    ['<p>safe.test</p><script>false.test', 'safe.test'],
    ['<script>false.test', ''],
    ['<script src="x.js"/><p>consumed.test</p>', ''],
  ])('uses browser recovery for unterminated and XHTML-style raw text', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<title>Analysis of <script> malware</title><p>safe.test</p>', 'safe.test'],
    ['<textarea><style>false.test</style></textarea><p>safe.test</p>', 'safe.test'],
    ['<!-- <script>false.test</script> --><p>safe.test</p>', 'safe.test'],
    ['<p title="<script>false.test</script>">safe.test</p>', 'safe.test'],
  ])('leaves parsing context to JSDOM', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<script>false.test</script><p>safe.test</p>', 'safe.test'],
    ['<template>false.test</template><p>safe.test</p>', 'safe.test'],
    ['<iframe>false.test</iframe><p>safe.test</p>', 'safe.test'],
    ['<noembed>false.test</noembed><p>safe.test</p>', 'safe.test'],
    ['<noframes>false.test</noframes><p>safe.test</p>', 'safe.test'],
    ['<textarea>false.test</textarea><p>safe.test</p>', 'safe.test'],
    ['<noscript><p>safe.test</p></noscript>', 'safe.test'],
  ])('removes non-rendered subtree %j with a boundary', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['c2.<strong>evil</strong>.test', 'c2.evil.test'],
    ['<span>evil.test</span><span>bad.test</span>', 'evil.testbad.test'],
    ['<custom>evil.test</custom><custom>bad.test</custom>', 'evil.test bad.test'],
    ['evil.test<script>false.test</script>bad.test', 'evil.test bad.test'],
  ])('preserves visible token boundaries', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<div hidden>false.test</div><p>safe.test</p>', 'safe.test'],
    ['<div style="display:none">false.test</div><p>safe.test</p>', 'safe.test'],
    ['<div style="display:var(--missing, none)">false.test</div><p>safe.test</p>', 'safe.test'],
    [
      '<div style="visibility:hidden">false.test<span style="visibility:visible">safe.test</span></div>',
      'safe.test',
    ],
    ['evil.test<span style="visibility:hidden">hidden</span>bad.test', 'evil.test bad.test'],
  ])('applies inline render state once', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it('handles adversarial nesting without a recursive application walk', () => {
    const html = `${'<div>'.repeat(1_000)}safe.test${'</div>'.repeat(1_000)}`;
    expect(stripHtml(html)).toBe('safe.test');
  });

  it('fails closed when DOM construction fails', () => {
    expect(stripHtml(Symbol('invalid html') as unknown as string)).toBe('');
  });

  it('caps parsing at 10 MB without splitting a UTF-8 code point', () => {
    const result = stripHtml(`${'€'.repeat(Math.ceil((10 * 1024 * 1024) / 3))}after-cap.test`);
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(10 * 1024 * 1024);
    expect(result).not.toContain('after-cap.test');
    expect(result).not.toContain('�');
  });
});

describe('htmlToStructured', () => {
  it('preserves headings, rows, lists, and block boundaries', () => {
    const html =
      '<h2>Indicators of Compromise</h2>' +
      '<table><tr><th>Type</th><th>Value</th></tr><tr><td>domain</td><td>evil.test</td></tr></table>' +
      '<ul><li>bad.test</li></ul><p>done</p>';
    expect(htmlToStructured(html)).toBe(
      '## Indicators of Compromise\n| Type | Value |\n| domain | evil.test |\n- bad.test\ndone'
    );
  });

  it('lifts links only in classified sections and keeps subsection scope', () => {
    const html =
      '<h2>IOCs</h2><h3>Domains</h3><a href="https://kept.test">one</a>' +
      '<h2>Analysis</h2><a href="https://dropped.test">two</a>';
    const result = htmlToStructured(html);
    expect(result).toContain('https://kept.test');
    expect(result).not.toContain('dropped.test');
  });

  it('classifies text restored inside an inherited-hidden heading', () => {
    const html =
      '<h2 style="visibility:hidden"><span style="visibility:visible">IOCs</span></h2>' +
      '<a href="https://c2.evil.test/x">indicator</a>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/x');
  });

  it('does not merge text around a hidden table-cell anchor', () => {
    const html =
      '<h2>IOCs</h2><table><tr><td>evil.test<a hidden href="https://false.test">hidden</a>bad.test</td></tr></table>';
    expect(htmlToStructured(html)).toContain('| evil.test bad.test |');
  });

  it.each([
    ['<ul><li>one<li>two</ul>', '- one\n- two'],
    ['<table><tr><td>one<td>two<tr><td>three<td>four</table>', '| one | two |\n| three | four |'],
  ])('preserves structure through malformed HTML recovery', (html, expected) => {
    expect(htmlToStructured(html)).toContain(expected);
  });
});

describe('text utilities', () => {
  it('collapses Unicode whitespace', () => {
    expect(stripHtml('\t one\u2028\u00a0two \n')).toBe('one two');
  });

  it.each([1, 2, 5, 10, 64, 1024])('keeps truncation within %i code units', (max) => {
    expect(truncate('word '.repeat(1_000), max).length).toBeLessThanOrEqual(max);
  });

  it('uses a nearby word boundary without splitting a surrogate pair', () => {
    expect(truncate('one two three four', 14)).toBe('one two three…');
    expect(truncate('ab😀cd', 4)).toBe('ab…');
    expect(truncate('value', 0)).toBe('');
  });
});

describe('buildReportContent', () => {
  it('builds a body and marks only a real title fallback', () => {
    expect(
      buildReportContent({ title: 'Title', bodyText: 'Body', bodyHtml: '<p>Body</p>' })
    ).toEqual({
      title: 'Title',
      body_text: 'Body',
      body_html: '<p>Body</p>',
      language: 'en',
    });
    expect(buildReportContent({ title: 'Title', bodyText: '  ' })).toEqual({
      title: 'Title',
      body_text: 'Title',
      language: 'en',
      body_is_title_fallback: true,
    });
  });
});
