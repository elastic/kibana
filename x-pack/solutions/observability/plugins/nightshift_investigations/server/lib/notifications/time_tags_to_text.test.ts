/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeTagsToText } from './time_tags_to_text';

const NOW = new Date('2026-11-27T12:00:00Z');

describe('timeTagsToText', () => {
  it.each([
    '<time datetime="2026-11-24T17:20:00Z"></time>',
    '<time datetime="2026-11-24T17:20:00Z"/>',
    "<time datetime='2026-11-24T17:20Z'>17:20Z</time>",
    '<time datetime="2026-11-24T18:20:00.500+01:00"></time>',
  ])('turns %s into a readable UTC time', (tag) => {
    expect(timeTagsToText(`Errors began at ${tag}.`, NOW)).toBe(
      'Errors began at Nov 24, 17:20 UTC.'
    );
  });

  it('adds the year for a time in another year and turns every tag of a window', () => {
    expect(
      timeTagsToText(
        'From <time datetime="2025-12-31T23:50:00Z"></time> to <time datetime="2026-01-01T00:10:00Z"></time>',
        NOW
      )
    ).toBe('From Dec 31, 2025, 23:50 UTC to Jan 1, 00:10 UTC');
  });

  it.each(['garbage', '2026-11-24T17:20:00', '2026-02-30T17:20:00Z', '2026-11-24T17:20:00+09:99'])(
    'keeps the inner text for the invalid datetime %s, else the tag',
    (value) => {
      expect(timeTagsToText(`at <time datetime="${value}">noon</time>`, NOW)).toBe('at noon');
      expect(timeTagsToText(`at <time datetime="${value}"></time>`, NOW)).toBe(
        `at <time datetime="${value}"></time>`
      );
    }
  );

  it('reads the datetime only from the opening tag', () => {
    expect(timeTagsToText('<time>reported datetime="2026-11-24T17:20:00Z"</time>', NOW)).toBe(
      'reported datetime="2026-11-24T17:20:00Z"'
    );
  });

  it('leaves text without a complete time tag alone', () => {
    const text = 'At 17:20Z, see <timeline> and <time datetime="2026-11-24T17:20:00Z"';
    expect(timeTagsToText(text, NOW)).toBe(text);
  });
});
