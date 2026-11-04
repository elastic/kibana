/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectExamplesById } from './example_filter';

const examples = [{ id: 'tp' }, { id: 'buried-c2' }, { id: 'injected-approval' }];

describe('selectExamplesById', () => {
  it.each([undefined, '', ' , '])('keeps every example for %p', (ids) => {
    expect(selectExamplesById(examples, ids)).toBe(examples);
  });

  it('keeps the listed examples in dataset order', () => {
    expect(selectExamplesById(examples, ' injected-approval,buried-c2 ')).toEqual([
      { id: 'buried-c2' },
      { id: 'injected-approval' },
    ]);
  });

  it('throws on an unknown id', () => {
    expect(() => selectExamplesById(examples, 'tp,buried-c3')).toThrow(
      'Unknown FP/TP example id buried-c3'
    );
  });
});
