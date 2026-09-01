/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlFragmentToStructuredText } from './html_fragment_to_structured_text';

describe('htmlFragmentToStructuredText', () => {
  it('returns empty structured text for empty input', () => {
    expect(htmlFragmentToStructuredText('')).toBe('');
    expect(htmlFragmentToStructuredText('   ')).toBe('');
  });

  it('preserves paragraph and break boundaries', () => {
    expect(
      htmlFragmentToStructuredText('<p>Hello <strong>world</strong></p><p>Next<br>line</p>')
    ).toBe('Hello world\nNext\nline');
  });

  it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])(
    'serializes <%s> with the section-miner heading contract',
    (tag) => {
      expect(htmlFragmentToStructuredText(`<${tag}>Indicators of Compromise</${tag}>`)).toBe(
        '## Indicators of Compromise'
      );
    }
  );

  it('preserves list items, rows, and table cells', () => {
    const fragment = [
      '<ul><li>evil.example</li><li>198.51.100.7</li></ul>',
      '<table><tr><th>Type</th><th>Indicator</th></tr>',
      '<tr><td>Domain</td><td>bad.example</td></tr></table>',
    ].join('');
    expect(htmlFragmentToStructuredText(fragment)).toBe(
      ['- evil.example', '- 198.51.100.7', '| Type | Indicator', '| Domain | bad.example'].join(
        '\n'
      )
    );
  });

  it('decodes entities and emits only visible anchor text', () => {
    expect(
      htmlFragmentToStructuredText(
        '<p>A &amp; B <a href="https://credential:secret@example.com/report">report link</a></p>'
      )
    ).toBe('A & B report link');
  });

  it.each(['script', 'style', 'template', 'iframe', 'noembed', 'noframes', 'title', 'textarea'])(
    'removes <%s> content without joining adjacent tokens',
    (tag) => {
      expect(htmlFragmentToStructuredText(`1.1.1.<${tag}>secret-token</${tag}>1`)).toBe(
        '1.1.1.\n1'
      );
    }
  );

  it('removes hidden subtrees while preserving token boundaries', () => {
    expect(htmlFragmentToStructuredText('<p>left<span hidden>secret.example</span>right</p>')).toBe(
      'left\nright'
    );
  });

  it('tolerates malformed fragments and plain text', () => {
    expect(htmlFragmentToStructuredText('<p>unclosed <b>bold')).toBe('unclosed bold');
    expect(htmlFragmentToStructuredText('just plain text with 8.8.8.8')).toBe(
      'just plain text with 8.8.8.8'
    );
  });

  it('bounds input and output without recursion', () => {
    const deeplyNested = `${'<div>'.repeat(5_000)}deep`;
    expect(() => htmlFragmentToStructuredText(deeplyNested)).not.toThrow();
    expect(htmlFragmentToStructuredText(`<p>${'a'.repeat(300_000)}</p>`)).toHaveLength(200_000);
  });

  it('does not split a surrogate pair at the output bound', () => {
    const text = `${'a'.repeat(199_999)}😀`;
    const result = htmlFragmentToStructuredText(`<p>${text}</p>`);
    expect(result).toHaveLength(199_999);
    expect(result.endsWith('\uD83D')).toBe(false);
  });
});
