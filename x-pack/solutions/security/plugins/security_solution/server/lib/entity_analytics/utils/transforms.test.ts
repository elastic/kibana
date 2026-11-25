/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestTransformId } from './transforms';

describe('getLatestTransformId', () => {
  it('keeps a short namespace in the transform id', () => {
    expect(getLatestTransformId('default')).toBe('risk_score_latest_transform_default');
  });

  it('hashes a namespace that would push the transform id past 64 characters', () => {
    const response = getLatestTransformId('a_a-'.repeat(1000));
    expect(response.length).toBeLessThanOrEqual(36);
    expect(response.startsWith('risk_score_latest_transform_')).toBe(true);
  });
});
