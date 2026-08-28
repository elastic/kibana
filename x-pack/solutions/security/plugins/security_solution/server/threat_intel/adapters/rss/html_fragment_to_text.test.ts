/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlFragmentToText } from './html_fragment_to_text';

describe('htmlFragmentToText', () => {
  it('returns empty string for empty input', () => {
    expect(htmlFragmentToText('')).toBe('');
    expect(htmlFragmentToText('   ')).toBe('');
  });

  it('extracts visible text from a simple fragment', () => {
    expect(htmlFragmentToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes HTML entities', () => {
    expect(htmlFragmentToText('<p>A &amp; B &lt;tag&gt;</p>')).toBe('A & B <tag>');
    expect(htmlFragmentToText('<p>path&#x2F;to&#47;file</p>')).toBe('path/to/file');
  });

  describe('non-content subtree removal', () => {
    it('drops <script> content entirely', () => {
      const text = htmlFragmentToText(
        '<p>before</p><script>alert("evil.com")</script><p>after</p>'
      );
      expect(text).not.toContain('alert');
      expect(text).not.toContain('evil.com');
      expect(text).toContain('before');
      expect(text).toContain('after');
    });

    it('drops <style> content entirely', () => {
      const text = htmlFragmentToText('<style>.x{color:red}</style><p>visible</p>');
      expect(text).toBe('visible');
    });

    it.each(['template', 'iframe', 'noembed', 'noframes', 'title', 'textarea'])(
      'drops <%s> content',
      (tag) => {
        const text = htmlFragmentToText(`<p>keep</p><${tag}>secret-token</${tag}>`);
        expect(text).not.toContain('secret-token');
        expect(text).toContain('keep');
      }
    );

    it('replaces a stripped subtree with a space so tokens cannot reassemble', () => {
      // Without a separating space, `1.1.1.` + `1` would glue into the IP `1.1.1.1`.
      const text = htmlFragmentToText('1.1.1.<script>x</script>1');
      expect(text).not.toContain('1.1.1.1');
      expect(text).toBe('1.1.1. 1');
    });
  });

  describe('token boundaries', () => {
    it('separates adjacent block elements', () => {
      expect(htmlFragmentToText('<p>alpha</p><p>beta</p>')).toBe('alpha beta');
    });

    it('separates list items', () => {
      expect(htmlFragmentToText('<ul><li>one</li><li>two</li></ul>')).toBe('one two');
    });

    it('separates table cells', () => {
      expect(htmlFragmentToText('<table><tr><td>a</td><td>b</td></tr></table>')).toBe('a b');
    });

    it('turns <br> into a separator', () => {
      expect(htmlFragmentToText('line one<br>line two')).toBe('line one line two');
    });

    it('collapses runs of whitespace introduced by boundaries', () => {
      expect(htmlFragmentToText('<div><p>x</p>\n\n  <p>y</p></div>')).toBe('x y');
    });
  });

  describe('malformed and adversarial input', () => {
    it('tolerates unclosed tags without throwing', () => {
      expect(htmlFragmentToText('<p>unclosed <b>bold')).toBe('unclosed bold');
    });

    it('tolerates a bare < that is not markup', () => {
      const text = htmlFragmentToText('price < 5 and value > 3');
      expect(text).toContain('price');
      expect(text).toContain('value');
    });

    it('returns plain text unchanged when there is no markup', () => {
      expect(htmlFragmentToText('just plain text with 8.8.8.8')).toBe(
        'just plain text with 8.8.8.8'
      );
    });
  });

  describe('bounds', () => {
    it('bounds the output length', () => {
      const huge = `<p>${'a'.repeat(5_000_000)}</p>`;
      const text = htmlFragmentToText(huge);
      expect(text.length).toBeLessThanOrEqual(200_000);
    });

    it('does not throw on very large input', () => {
      expect(() => htmlFragmentToText('<p>x</p>'.repeat(500_000))).not.toThrow();
    });
  });

  it('does not fetch or expand external references', () => {
    // An <img src>/<a href> is inert text-wise: only the visible text survives, no URL.
    const text = htmlFragmentToText('<a href="https://evil.example/x">click</a>');
    expect(text).toBe('click');
  });
});
