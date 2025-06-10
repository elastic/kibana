/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCombined } from '.';

describe('getCombined', () => {
  it('combines two strings correctly', () => {
    const combinedGenerations = 'generation1';
    const partialResponse = 'response1';
    const expected = 'generation1response1';
    const result = getCombined({ combinedGenerations, partialResponse });

    expect(result).toEqual(expected);
  });

  it('handles empty combinedGenerations', () => {
    const combinedGenerations = '';
    const partialResponse = 'response1';
    const expected = 'response1';
    const result = getCombined({ combinedGenerations, partialResponse });

    expect(result).toEqual(expected);
  });

  it('handles an empty partialResponse', () => {
    const combinedGenerations = 'generation1';
    const partialResponse = '';
    const expected = 'generation1';
    const result = getCombined({ combinedGenerations, partialResponse });

    expect(result).toEqual(expected);
  });
});
