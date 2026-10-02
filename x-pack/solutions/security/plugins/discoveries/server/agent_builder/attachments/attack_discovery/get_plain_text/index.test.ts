/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlainText } from '.';

const HOST_UUID = '3d241119-f77a-454e-8ee3-d36e05a8714f';
const USER_UUID = 'b7cf60c1-090d-4676-aad6-666724501baf';

const timeMs = (render: () => void): number => {
  const start = process.hrtime.bigint();
  render();
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe('getPlainText', () => {
  it('renders field tokens as their values', () => {
    expect(
      getPlainText({ markdown: `Activity on {{ host.name ${HOST_UUID} }}`, maxLength: 100 })
    ).toBe(`Activity on \`${HOST_UUID}\``);
  });

  it('inserts the original values', () => {
    expect(
      getPlainText({
        markdown: `{{ host.name ${HOST_UUID} }} and {{ user.name ${USER_UUID} }}`,
        maxLength: 100,
        replacements: { [HOST_UUID]: 'SRVWIN04', [USER_UUID]: 'Administrator' },
      })
    ).toBe('`SRVWIN04` and `Administrator`');
  });

  it('inserts original values outside tokens too', () => {
    expect(
      getPlainText({
        markdown: `Title for ${HOST_UUID}`,
        maxLength: 100,
        replacements: { [HOST_UUID]: 'SRVWIN04' },
      })
    ).toBe('Title for SRVWIN04');
  });

  it('keeps a UUID that has no replacement', () => {
    expect(
      getPlainText({
        markdown: `{{ host.name ${HOST_UUID} }}`,
        maxLength: 100,
        replacements: { [USER_UUID]: 'Administrator' },
      })
    ).toBe(`\`${HOST_UUID}\``);
  });

  // Rendering after inserting it would close the token at the value's `}}`.
  it('keeps an original value that contains `}}` intact', () => {
    expect(
      getPlainText({
        markdown: `Ran {{ process.command_line ${HOST_UUID} }}`,
        maxLength: 100,
        replacements: { [HOST_UUID]: 'cmd /c "echo }} done"' },
      })
    ).toBe('Ran `cmd /c "echo }} done"`');
  });

  // Rendering after inserting it would not match a token that spans lines.
  it('keeps an original value that contains a newline intact', () => {
    expect(
      getPlainText({
        markdown: `Ran {{ process.command_line ${HOST_UUID} }}`,
        maxLength: 100,
        replacements: { [HOST_UUID]: 'line one\nline two' },
      })
    ).toBe('Ran `line one\nline two`');
  });

  it('truncates the result to maxLength', () => {
    expect(
      getPlainText({
        markdown: `${HOST_UUID} ${HOST_UUID}`,
        maxLength: 10,
        replacements: { [HOST_UUID]: 'a'.repeat(1024) },
      })
    ).toBe(`${'a'.repeat(10)}…`);
  });

  it('inserts original values in linear time at the bounds', () => {
    const markdown = `${HOST_UUID} `.repeat(1350);
    const replacements = Object.fromEntries([
      [HOST_UUID, 'a'.repeat(1024)],
      ...Array.from({ length: 999 }, (_, index) => [
        `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        'b',
      ]),
    ]);

    expect(timeMs(() => getPlainText({ markdown, maxLength: 50_000, replacements }))).toBeLessThan(
      500
    );
  });
});
