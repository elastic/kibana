/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Tokenizer } from 'parse5';
import { parseHtml } from './html_parser';

const parsedHtml = (html: string): string => (parseHtml(html).$.root().html() ?? '').trim();

describe('shared HTML parser', () => {
  it.each([' ', '\t', '\n', '\r', '\f'])('accepts %j as HTML whitespace in an end tag', (space) => {
    expect(parsedHtml(`<script>false-ioc.test</script${space}><p>safe</p>`)).toBe('<p>safe</p>');
  });

  it.each([
    ['NBSP', '<script>x</script\u00a0>decoy</script><p>safe</p>'],
    ['longer name', '<script>x</scriptfoo>decoy</script><p>safe</p>'],
  ])('does not accept a %s as a raw-text close boundary', (_label, html) => {
    expect(parsedHtml(html)).toBe('<p>safe</p>');
  });

  it.each(['<script src="x.js"/><p>safe</p>', '<style/><p>safe</p>'])(
    'supports an XHTML-style self-closing raw-text token',
    (html) => {
      expect(parsedHtml(html)).toBe('<p>safe</p>');
    }
  );

  it('keeps a slash in an unquoted attribute value inside the raw-text element', () => {
    expect(parsedHtml('<script src=x/>false-ioc.test</script><p>safe</p>')).toBe('<p>safe</p>');
  });

  it.each([
    '<script>false-ioc.test</script/><p>safe</p>',
    '<script>false-ioc.test</script foo="a>also-false.test"><p>safe</p>',
  ])('uses the standards tokenizer for the complete end-tag range', (html) => {
    expect(parsedHtml(html)).toBe('<p>safe</p>');
  });

  it.each([
    ['<title>Analysis of <script> malware</title><article>IOC: evil.test</article>', 'evil.test'],
    ['<textarea>Example <style> text</textarea><p>safe</p>', 'safe'],
  ])('does not tokenize raw-text-looking text inside an RCDATA element', (html, survivingText) => {
    const parsed = parsedHtml(html);
    expect(parsed).toContain(survivingText);
  });

  it('keeps markup-looking CDATA opaque', () => {
    const html = '<![CDATA[x><script>false-ioc.test</script>y]]><p>safe</p>';
    expect(parsedHtml(html)).toBe(html);
  });

  it.each([
    '<!-- <script>false-ioc.test</script> --><p>safe</p>',
    '<p title="<script>false-ioc.test</script>">safe</p>',
  ])('does not create raw-text nodes from non-markup context', (html) => {
    expect(parsedHtml(html)).toContain('<p');
  });

  it('reports an unterminated raw-text element and removes it through EOF', () => {
    const parsed = parseHtml('<p>safe</p><style>false-ioc.test');
    expect({ html: parsed.$.root().html(), unclosed: parsed.hasUnclosedRawText }).toEqual({
      html: '<p>safe</p> ',
      unclosed: true,
    });
  });

  it('scans many sibling raw-text nodes once each', () => {
    const html = `${'<script>false.test</script>'.repeat(5_000)}<p>safe</p>`;
    const started = process.hrtime.bigint();

    expect(parsedHtml(html)).toBe('<p>safe</p>');
    expect(Number(process.hrtime.bigint() - started) / 1e6).toBeLessThan(1_000);
  });

  it('fails closed when exact range tokenization fails', () => {
    const write = jest.spyOn(Tokenizer.prototype, 'write').mockImplementationOnce(() => {
      throw new Error('injected tokenizer failure');
    });
    try {
      expect(parsedHtml('<script>must-not-survive.test</script><p>also-dropped.test</p>')).toBe('');
    } finally {
      write.mockRestore();
    }
  });
});
