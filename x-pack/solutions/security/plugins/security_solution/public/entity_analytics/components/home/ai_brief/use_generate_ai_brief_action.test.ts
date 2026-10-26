/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalCardData } from '../needs_attention_tiles/data';
import { isWaitingForCounts } from './use_generate_ai_brief_action';

const card = (overrides: Partial<SignalCardData>): SignalCardData => ({
  id: 'entitiesWithAnomalies',
  title: 'Entities with anomalies',
  value: 0,
  description: 'Entities with at least one ML anomaly',
  filterLabel: 'Entities with anomalies',
  ...overrides,
});

describe('isWaitingForCounts', () => {
  it.each<[string, SignalCardData[], boolean]>([
    ['waits for a count that is loading', [card({ isLoading: true })], true],
    ['waits for a change that is loading', [card({ isDeltaLoading: true })], true],
    [
      'does not wait for a count that cannot be read, such as anomalies without ML jobs',
      [card({ isLoading: true, isUnavailable: true })],
      false,
    ],
    ['is done when every count has loaded', [card({})], false],
  ])('%s', (_name, cards, expected) => {
    expect(isWaitingForCounts(cards)).toBe(expected);
  });
});
