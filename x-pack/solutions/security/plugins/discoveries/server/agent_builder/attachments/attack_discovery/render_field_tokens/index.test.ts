/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownFields } from '@kbn/elastic-assistant-common';

import { renderFieldTokens } from '.';

const timeMs = (render: () => void): number => {
  const start = process.hrtime.bigint();
  render();
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe('renderFieldTokens', () => {
  it('renders a token as its backticked value', () => {
    expect(renderFieldTokens('Activity on {{ host.name host-1 }}')).toBe('Activity on `host-1`');
  });

  it('renders every token', () => {
    expect(renderFieldTokens('{{ host.name host-1 }} and {{ user.name alice }}')).toBe(
      '`host-1` and `alice`'
    );
  });

  it('keeps spaces inside a value', () => {
    expect(renderFieldTokens('{{ process.command_line cmd /c echo hi }}')).toBe('`cmd /c echo hi`');
  });

  it('keeps text without tokens unchanged', () => {
    expect(renderFieldTokens('No tokens here')).toBe('No tokens here');
  });

  it('keeps an unclosed token unchanged', () => {
    expect(renderFieldTokens('Unclosed {{ host.name host-1')).toBe('Unclosed {{ host.name host-1');
  });

  it('keeps a token without a value separator unchanged', () => {
    expect(renderFieldTokens('{{host.name}} stays')).toBe('{{host.name}} stays');
  });

  it('keeps a token that spans lines unchanged', () => {
    expect(renderFieldTokens('{{ host.name host-1\n}}')).toBe('{{ host.name host-1\n}}');
  });

  it.each([
    'A multi-stage attack on {{ host.name SRVWIN07 }} by {{ user.name Administrator }}.',
    '- Initial access on {{ host.name 96c619f7-3860-49c1-b961-5583b1534b0e }} via {{ process.name mshta.exe }}',
    'Mixed {{ a b }} text {{ c d e }} and {{bad}} and {{ unclosed',
    '{{{ nested value }} and }} stray',
    '',
  ])('matches getMarkdownFields for well-formed tokens in %j', (markdown) => {
    expect(renderFieldTokens(markdown)).toBe(getMarkdownFields(markdown));
  });

  // The regular expression in `getMarkdownFields` takes minutes to hours on these; a linear
  // parser takes milliseconds.
  describe('worst-case input at the 50k details bound', () => {
    it.each([
      ['a long run of whitespace after an unclosed token', `{{ a ${' '.repeat(49_995)}`],
      ['many unclosed tokens', '{{ a '.repeat(10_000)],
      ['many openers before one close', `${'{{ a b '.repeat(7_000)}}}`],
      ['a closing brace after long whitespace', `}} {{ a ${' '.repeat(49_990)}`],
    ])('renders %s in linear time', (_, markdown) => {
      expect(timeMs(() => renderFieldTokens(markdown))).toBeLessThan(500);
    });
  });
});
