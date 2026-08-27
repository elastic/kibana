/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Tokenizer } from 'parse5';
import { sanitizeRawText } from './raw_text';

describe('raw-text sanitization', () => {
  it.each([' ', '\t', '\n', '\r', '\f'])('accepts %j as HTML whitespace in an end tag', (space) => {
    const input = `<script>fetch("https://false-ioc.test")</script${space}><p>safe</p>`;

    expect(sanitizeRawText(input)).toEqual({
      html: ' <p>safe</p>',
      hasUnclosedRawText: false,
    });
  });

  it('does not treat NBSP as an HTML end-tag boundary', () => {
    const input =
      '<script>const decoy="</script\u00a0>"; fetch("https://false-ioc.test")</script><p>safe</p>';

    expect(sanitizeRawText(input).html).toBe(' <p>safe</p>');
  });

  it('removes only an XHTML-style self-closing raw-text token', () => {
    expect(sanitizeRawText('<script src="x.js"/><p>safe</p>').html).toBe(' <p>safe</p>');
  });

  it('does not treat a slash in an unquoted attribute value as self-closing', () => {
    expect(sanitizeRawText('<script src=x/>false-ioc.test</script><p>safe</p>').html).toBe(
      ' <p>safe</p>'
    );
  });

  it('uses the complete parser-defined end-tag range', () => {
    const input = '<script>false-ioc.test</script foo="a>also-false.test"><p>safe</p>';

    expect(sanitizeRawText(input).html).toBe(' <p>safe</p>');
  });

  it('keeps markup-looking CDATA text opaque', () => {
    const input = '<![CDATA[x><script>false-ioc.test</script>y]]><p>safe</p>';

    expect(sanitizeRawText(input).html).toBe(input);
  });

  it.each([
    '<!-- <script>false-ioc.test</script> --><p>safe</p>',
    '<p title="<script>false-ioc.test</script>">safe</p>',
    '<?feed <script>false-ioc.test</script>><p>safe</p>',
    '<!vendor <style>false-ioc.test</style>><p>safe</p>',
  ])('does not remove raw-text-looking syntax outside markup context', (input) => {
    expect(sanitizeRawText(input).html).toBe(input);
  });

  it('removes an unterminated raw-text element through end of input', () => {
    expect(sanitizeRawText('<p>safe</p><style>false-ioc.test')).toEqual({
      html: '<p>safe</p> ',
      hasUnclosedRawText: true,
    });
  });

  it('uses a space replacement so decoded fragments cannot reassemble markup', () => {
    const input = '&lt;scr<script>false-ioc.test</script>ipt&gt;safe';

    expect(sanitizeRawText(input).html).toBe('&lt;scr ipt&gt;safe');
  });

  it('fails closed when the tokenizer unexpectedly fails', () => {
    const write = jest.spyOn(Tokenizer.prototype, 'write');
    write.mockImplementationOnce(() => {
      throw new Error('injected tokenizer failure');
    });

    try {
      expect(sanitizeRawText('<p>must-not-survive.test</p>')).toEqual({
        html: '',
        hasUnclosedRawText: false,
      });
    } finally {
      write.mockRestore();
    }
  });

  it('still surfaces a programming error at a typed boundary', () => {
    expect(() => sanitizeRawText({} as unknown as string)).toThrow(TypeError);
  });
});
