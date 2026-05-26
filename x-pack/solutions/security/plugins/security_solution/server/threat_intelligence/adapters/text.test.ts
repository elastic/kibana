/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReportContent, collapseWhitespace, stripHtml, truncate } from './text';

describe('stripHtml', () => {
  it('returns an empty string for nullish input', () => {
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml('')).toBe('');
  });

  it('drops <script> and <style> bodies before tag stripping', () => {
    const html = `<p>before</p><script>alert("xss")</script><style>body{color:red}</style><p>after</p>`;
    const result = stripHtml(html);
    expect(result).toBe('before after');
  });

  it('decodes the named entities feeds use most often', () => {
    const html = '<p>&copy;&nbsp;Acme &mdash; &ldquo;hello&rdquo;</p>';
    expect(stripHtml(html)).toBe('\u00a9 Acme \u2014 \u201chello\u201d');
  });

  it('decodes numeric (decimal and hex) entities', () => {
    expect(stripHtml('&#65; &#x42;')).toBe('A B');
  });

  it('collapses whitespace runs introduced by tag-stripping', () => {
    expect(stripHtml('<p>a</p>\n<p>  b  </p>')).toBe('a b');
  });
});

describe('collapseWhitespace', () => {
  it('replaces runs of whitespace (including unicode separators) with a single space', () => {
    expect(collapseWhitespace('  hello\n\tworld\u2028!  ')).toBe('hello world !');
  });
});

describe('truncate', () => {
  it('returns the input unchanged when shorter than max', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('appends an ellipsis when truncated', () => {
    expect(truncate('a'.repeat(50), 10)).toBe('aaaaaaaaaa\u2026');
  });

  it('respects a word boundary close to the cap', () => {
    // The boundary heuristic only honors `lastIndexOf(' ')` when it
    // lands past 60% of the cap. For maxLength=12, the heuristic
    // requires a space at index >= 7.2; the trailing space at index 11
    // (after "hello world") qualifies, so we cut on that boundary.
    const input = 'hello world goodbye';
    expect(truncate(input, 12)).toBe('hello world\u2026');
  });

  it('falls back to a hard cut when the boundary is too far back', () => {
    // The "word" is the entire string, so there's no boundary close
    // to the cap. The hard cut wins.
    const input = 'noboundariesatallnoboundariesatall';
    expect(truncate(input, 5).startsWith('nobou')).toBe(true);
    expect(truncate(input, 5).endsWith('\u2026')).toBe(true);
  });
});

describe('buildReportContent', () => {
  it('builds the strict-mapping content block without bm25 siblings', () => {
    expect(
      buildReportContent({
        title: 'Ransomware uptick',
        bodyText: 'Campaign details',
        language: 'en',
      })
    ).toEqual({
      title: 'Ransomware uptick',
      body_text: 'Campaign details',
      language: 'en',
    });
    expect(
      buildReportContent({
        title: 'Advisory',
        bodyText: 'Details',
        bodyHtml: '<p>Details</p>',
      })
    ).toEqual({
      title: 'Advisory',
      body_text: 'Details',
      body_html: '<p>Details</p>',
    });
  });
});
