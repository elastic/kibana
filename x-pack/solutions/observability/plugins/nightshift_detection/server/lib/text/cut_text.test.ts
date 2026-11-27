/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cutText } from './cut_text';

describe('cutText', () => {
  it.each([
    ['shorter than the limit', 'abc', 5, { text: 'abc', cut: false }],
    ['exactly the limit', 'abcde', 5, { text: 'abcde', cut: false }],
    ['one over the limit', 'abcdef', 5, { text: 'abcde', cut: true }],
    ['a limit of 0', 'abc', 0, { text: '', cut: true }],
  ])('keeps text %s', (_title, text, maxLength, expected) => {
    expect(cutText(text, maxLength)).toEqual(expected);
  });

  it('drops half of an emoji that straddles the cut, so the text stays valid', () => {
    // The emoji takes two UTF-16 units: a cut after the first would keep only its high surrogate.
    expect(cutText('ab😀cd', 3)).toEqual({ text: 'ab', cut: true });
  });

  it('keeps an emoji that fits whole', () => {
    expect(cutText('ab😀cd', 4)).toEqual({ text: 'ab😀', cut: true });
  });
});
