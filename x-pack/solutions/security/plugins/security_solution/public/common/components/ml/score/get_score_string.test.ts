/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScoreString } from './get_score_string';

describe('create_influencers', () => {
  test('it rounds up to 1 from 0.3', () => {
    const score = getScoreString(0.3);
    expect(score).toEqual('1');
  });

  test('it rounds up to 1 from 0.000000001', () => {
    const score = getScoreString(0.000000001);
    expect(score).toEqual('1');
  });

  test('0 is 0', () => {
    const score = getScoreString(0);
    expect(score).toEqual('0');
  });

  test('99.1 is 100', () => {
    const score = getScoreString(99.1);
    expect(score).toEqual('100');
  });

  test('100 is 100', () => {
    const score = getScoreString(100);
    expect(score).toEqual('100');
  });
});
