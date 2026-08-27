/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Tokenizer } from 'parse5';
import {
  MAX_PARSE_BYTES,
  buildReportContent,
  capToParseBytes,
  collapseWhitespace,
  htmlToStructured,
  stripHtml,
  truncate,
} from './text';

describe('stripHtml', () => {
  it.each([
    [undefined, ''],
    [null, ''],
    ['', ''],
    ['<p>Hello <strong>world</strong></p>', 'Hello world'],
    ['<p>5 &lt; 10 and CVSS &gt; 7</p>', '5 < 10 and CVSS > 7'],
    ['<p>&copy;&nbsp;Acme &mdash; &ldquo;hello&rdquo;</p>', '© Acme — “hello”'],
    ['<p>&#65; &#x42;</p>', 'A B'],
    ['<p>one</p><!-- hidden.test --><p>two</p>', 'one two'],
  ])('extracts visible text from %j', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    '<script>false.test</script><p>safe.test</p>',
    '<style>.false{display:block}</style><p>safe.test</p>',
    '<script>false.test</script ><p>safe.test</p>',
    '<script>false.test</script\t junk><p>safe.test</p>',
    '<script>false.test</script foo="a>b"><p>safe.test</p>',
    '<script>false.test</script/><p>safe.test</p>',
    '<script src="x.js"/><p>safe.test</p>',
    '<style/><p>safe.test</p>',
    '<script src=x/>false.test</script><p>safe.test</p>',
    '<script>x</script\u00a0>false.test</script><p>safe.test</p>',
    '<script>x</scriptfoo>false.test</script><p>safe.test</p>',
  ])('removes raw-text nodes without losing a following sibling', (html) => {
    expect(stripHtml(html)).toBe('safe.test');
  });

  it.each([
    ['<p>safe.test</p><script>false.test', 'safe.test'],
    ['<p>safe.test</p><style>false.test', 'safe.test'],
    ['<script>false.test', ''],
  ])('removes an unterminated raw-text node through EOF', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    [
      '<title>Analysis of <script> malware</title><article>IOC: safe.test</article>',
      'IOC: safe.test',
    ],
    ['<textarea><style>false.test</style></textarea><p>safe.test</p>', 'safe.test'],
    ['<!-- <script>false.test</script> --><p>safe.test</p>', 'safe.test'],
    ['<p title="<script>false.test</script>">safe.test</p>', 'safe.test'],
  ])('keeps raw-text-looking syntax in its parser-defined context', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['&lt;p&gt;safe.test&lt;/p&gt;', 'safe.test'],
    ['&lt;p&gt;safe&lt;/p&gt;&lt;script&gt;false.test&lt;/script&gt;', 'safe'],
    ['Use &lt;script&gt; carefully', 'Use <script> carefully'],
    ['<p>Show &lt;script&gt;example&lt;/script&gt;</p>', 'Show <script>example</script>'],
  ])('handles entity-encoded markup without recursive interpretation', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<![CDATA[<article><p>safe.test</p></article>]]>', 'safe.test'],
    ['<![CDATA[<script>false.test</script><p>safe.test</p>]]>', 'safe.test'],
    ['<![CDATA[Use <script> literally]]>', 'Use <script> literally'],
    ['<![CDATA[Use <style> literally]]>', 'Use <style> literally'],
  ])('handles CDATA payloads', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<template>false.test</template><p>safe.test</p>', 'safe.test'],
    ['<iframe>false.test</iframe><p>safe.test</p>', 'safe.test'],
    ['<noembed>false.test</noembed><p>safe.test</p>', 'safe.test'],
    ['<noframes>false.test</noframes><p>safe.test</p>', 'safe.test'],
    ['<title>false.test</title><p>safe.test</p>', 'safe.test'],
    ['<textarea>false.test</textarea><p>safe.test</p>', 'safe.test'],
    ['<noscript>safe.test</noscript>', 'safe.test'],
    ['<xmp>safe-xmp.test<script>safe-nested.test</script></xmp>', 'safe-xmp.testsafe-nested.test'],
    [
      '<plaintext>safe-plain.test<script>safe-nested.test</script></plaintext>',
      'safe-plain.testsafe-nested.test',
    ],
  ])('matches reader-visible subtree behavior', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['c2.<strong>evil</strong>.test', 'c2.evil.test'],
    ['<span>evil.test</span><span>bad.test</span>', 'evil.testbad.test'],
    ['<custom>evil.test</custom><custom>bad.test</custom>', 'evil.test bad.test'],
  ])('preserves intentional token boundaries', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['<div hidden>false.test</div><p>safe.test</p>', 'safe.test'],
    ['<div style="display:none">false.test</div><p>safe.test</p>', 'safe.test'],
    ['<div style="display:var(--missing, none)">false.test</div><p>safe.test</p>', 'safe.test'],
    ['<xmp hidden>false.test</xmp><p>safe.test</p>', 'safe.test'],
    ['<plaintext style="display:none">false.test', ''],
    [
      '<div style="visibility:hidden">false.test<span style="visibility:visible">safe.test</span></div>',
      'safe.test',
    ],
    ['evil.test<span style="visibility:hidden">hidden</span>bad.test', 'evil.test bad.test'],
  ])('applies shared render state', (html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it('fails closed if exact raw-text tokenization fails', () => {
    const write = jest.spyOn(Tokenizer.prototype, 'write').mockImplementationOnce(() => {
      throw new Error('injected failure');
    });
    try {
      expect(stripHtml('<script>false.test</script><p>must-not-survive.test</p>')).toBe('');
    } finally {
      write.mockRestore();
    }
  });

  it('walks deeply nested input iteratively', () => {
    const html = `${'<div>'.repeat(20_000)}safe.test${'</div>'.repeat(20_000)}`;
    expect(stripHtml(html)).toBe('safe.test');
  });
});

describe('htmlToStructured', () => {
  it.each([[undefined], [null], ['']])('returns empty for %j', (html) => {
    expect(htmlToStructured(html)).toBe('');
  });

  it('preserves headings, rows, lists, and block boundaries', () => {
    const html =
      '<h2>Indicators of Compromise</h2>' +
      '<table><tr><th>Type</th><th>Value</th></tr><tr><td>domain</td><td>evil.test</td></tr></table>' +
      '<ul><li>bad.test</li></ul><p>done</p>';
    expect(htmlToStructured(html)).toBe(
      '## Indicators of Compromise\n| Type | Value |\n| domain | evil.test |\n- bad.test\ndone'
    );
  });

  it.each([
    ['<h2>IOCs</h2><a href="https://evil.test/path">indicator</a>', 'https://evil.test/path'],
    ['<h2>References</h2><a href=https://evil.test/path>source</a>', 'https://evil.test/path'],
    ['<h2>Summary</h2><a href="https://noise.test">citation</a>', 'citation'],
  ])('lifts hrefs only in semantic sections', (html, expected) => {
    const result = htmlToStructured(html);
    expect(result).toContain(expected);
    if (expected === 'citation') expect(result).not.toContain('noise.test');
  });

  it('keeps a classified section through deeper prose and ends it at the same depth', () => {
    const html =
      '<h2>IOCs</h2><h3>Domains</h3><a href="https://kept.test">one</a>' +
      '<h2>Analysis</h2><a href="https://dropped.test">two</a>';
    const result = htmlToStructured(html);
    expect(result).toContain('kept.test');
    expect(result).not.toContain('dropped.test');
  });

  it('classifies visible text restored inside a hidden heading wrapper', () => {
    const html =
      '<h2 style="visibility:hidden"><span style="visibility:visible">IOCs</span></h2>' +
      '<a href="https://c2.evil.test/x">indicator</a>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/x');
  });

  it('keeps a boundary around a visibility-hidden anchor in an IOC row', () => {
    const html =
      '<h2>IOCs</h2><table><tr><td>evil.test<a style="visibility:hidden" href="https://false.test">hidden</a>bad.test</td></tr></table>';
    expect(htmlToStructured(html)).toContain('| evil.test bad.test |');
  });

  it.each([
    ['<ul><li>one<li>two</ul>', '- one\n- two'],
    ['<table><tr><td>one<td>two<tr><td>three<td>four</table>', '| one | two |\n| three | four |'],
    ['<![CDATA[<h2>IOCs</h2><a href="https://evil.test">indicator</a>]]>', 'https://evil.test'],
  ])('preserves structure through parser recovery', (html, expected) => {
    expect(htmlToStructured(html)).toContain(expected);
  });

  it.each([
    '<h2>IOCs</h2><script>false.test</script><p>safe.test</p>',
    '<h2>IOCs</h2><div style="display:none">false.test</div><p>safe.test</p>',
    '<h2>IOCs</h2><xmp hidden>false.test</xmp><p>safe.test</p>',
    '<h2>IOCs</h2><template>false.test</template><p>safe.test</p>',
  ])('omits non-rendered structured content', (html) => {
    const result = htmlToStructured(html);
    expect(result).toContain('safe.test');
    expect(result).not.toContain('false.test');
  });
});

describe('text utilities', () => {
  it('collapses Unicode whitespace', () => {
    expect(collapseWhitespace('\t one\u2028\u00a0two \n')).toBe('one two');
  });

  it.each([1, 2, 5, 10, 64, 1024])('keeps truncation within %i code units', (max) => {
    expect(truncate('word '.repeat(1000), max).length).toBeLessThanOrEqual(max);
  });

  it('uses a nearby word boundary without splitting a surrogate pair', () => {
    expect(truncate('one two three four', 14)).toBe('one two three…');
    expect(truncate('ab😀cd', 4)).toBe('ab…');
    expect(truncate('value', 0)).toBe('');
  });

  it('caps parser input by UTF-8 bytes at a complete code point', () => {
    const capped = capToParseBytes('😀'.repeat(MAX_PARSE_BYTES));
    expect(Buffer.byteLength(capped, 'utf8')).toBeLessThanOrEqual(MAX_PARSE_BYTES);
    expect(capped).not.toMatch(/[\uD800-\uDBFF]$/);
  });
});

describe('buildReportContent', () => {
  it('builds a real body without a fallback flag', () => {
    expect(
      buildReportContent({ title: 'Title', bodyText: 'Body', bodyHtml: '<p>Body</p>' })
    ).toEqual({
      title: 'Title',
      body_text: 'Body',
      body_html: '<p>Body</p>',
      language: 'en',
    });
  });

  it('marks a title fallback only when a title exists', () => {
    expect(buildReportContent({ title: 'Title', bodyText: '  ' })).toEqual({
      title: 'Title',
      body_text: 'Title',
      language: 'en',
      body_is_title_fallback: true,
    });
    expect(buildReportContent({ title: '', bodyText: '' })).toEqual({
      title: '',
      body_text: '',
      language: 'en',
    });
  });
});
