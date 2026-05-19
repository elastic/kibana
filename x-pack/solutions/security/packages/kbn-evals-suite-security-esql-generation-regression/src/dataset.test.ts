/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlGenerationDataset } from './dataset';

describe('esqlGenerationDataset', () => {
  it('has 31 examples', () => {
    expect(esqlGenerationDataset).toHaveLength(31);
  });

  it('every entry has a non-empty input.question', () => {
    for (const example of esqlGenerationDataset) {
      expect(typeof example.input?.question).toBe('string');
      expect((example.input?.question ?? '').length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty output.query', () => {
    for (const example of esqlGenerationDataset) {
      expect(typeof example.output?.query).toBe('string');
      expect((example.output?.query ?? '').length).toBeGreaterThan(0);
    }
  });
});
