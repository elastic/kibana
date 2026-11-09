/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundText } from './bound_string';
import {
  ELLIPSIS,
  MAX_INPUT_STRING_CHARS,
} from '../../../../../common/workflows/step_types/common/budget';

describe('boundText', () => {
  it('bounds decomposed text by code points including the ellipsis', () => {
    const value = 'e\u0301'.repeat(130);
    const result = boundText(value, MAX_INPUT_STRING_CHARS);

    expect(Array.from(result)).toHaveLength(MAX_INPUT_STRING_CHARS);
    expect(result).toBe(
      Array.from(value)
        .slice(0, MAX_INPUT_STRING_CHARS - Array.from(ELLIPSIS).length)
        .join('') + ELLIPSIS
    );
  });

  it('preserves text that fits the code-point bound', () => {
    const value = '😀'.repeat(MAX_INPUT_STRING_CHARS);

    expect(boundText(value, MAX_INPUT_STRING_CHARS)).toBe(value);
  });
});
