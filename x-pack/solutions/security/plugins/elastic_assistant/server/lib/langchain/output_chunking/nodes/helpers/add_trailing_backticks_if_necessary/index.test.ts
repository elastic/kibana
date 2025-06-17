/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addTrailingBackticksIfNecessary } from '.';

describe('addTrailingBackticksIfNecessary', () => {
  it('adds trailing backticks when necessary', () => {
    const input = '```json\n{\n  "key": "value"\n}';
    const expected = '```json\n{\n  "key": "value"\n}\n```';
    const result = addTrailingBackticksIfNecessary(input);

    expect(result).toEqual(expected);
  });

  it('does NOT add trailing backticks when they are already present', () => {
    const input = '```json\n{\n  "key": "value"\n}\n```';
    const result = addTrailingBackticksIfNecessary(input);

    expect(result).toEqual(input);
  });

  it("does NOT add trailing backticks when there's no leading JSON wrapper", () => {
    const input = '{\n  "key": "value"\n}';
    const result = addTrailingBackticksIfNecessary(input);

    expect(result).toEqual(input);
  });

  it('handles empty string input', () => {
    const input = '';
    const result = addTrailingBackticksIfNecessary(input);

    expect(result).toEqual(input);
  });

  it('handles input without a JSON wrapper, but with trailing backticks', () => {
    const input = '{\n  "key": "value"\n}\n```';
    const result = addTrailingBackticksIfNecessary(input);

    expect(result).toEqual(input);
  });
});
