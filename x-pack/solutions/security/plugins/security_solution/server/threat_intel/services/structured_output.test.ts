/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requireParsedStructuredOutput } from './structured_output';

describe('requireParsedStructuredOutput', () => {
  it('returns output already parsed by withStructuredOutput', () => {
    const result = {
      raw: { response_metadata: {} },
      parsed: { answer: 42 },
    };

    expect(requireParsedStructuredOutput(result, 'test_stage')).toEqual(result);
  });

  it('throws when includeRaw returns no parsed output', () => {
    expect(() =>
      requireParsedStructuredOutput({ raw: { response_metadata: {} }, parsed: null }, 'test_stage')
    ).toThrow('test_stage returned no parsed output');
  });
});
