/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SseDetection } from './derive_detections';
import {
  filterRestatedEvidence,
  SSE_CONFIRMED_HIT_BULLET_PREFIX,
  SSE_TIER1_HIT_BULLET_PREFIX,
  SSE_TIER2_HIT_BULLET_PREFIX,
} from './evidence_restatement';

const ioc: SseDetection = {
  id: 'ioc:ip:203.0.113.5',
  kind: 'ioc',
  field: 'destination.ip',
  basis: 'ioc_strong',
  matched_on: [{ field: 'destination.ip', value: '203.0.113.5' }],
  total: 4,
};
const behavior: SseDetection = {
  id: 'behavior:T1071',
  kind: 'behavior',
  technique_id: 'T1071',
  basis: 'behavior_only',
  matched_on: [],
  total: 3,
};
const tier1 = `${SSE_TIER1_HIT_BULLET_PREFIX}12 event(s) in the hunt window.`;
const tier2 = `${SSE_TIER2_HIT_BULLET_PREFIX}T1071 with 3 required-index row(s).`;
const confirmed = `${SSE_CONFIRMED_HIT_BULLET_PREFIX}; see hunt_result for structured detail.`;
const finding = 'Unusual outbound curl to loopback across two hosts';

describe('filterRestatedEvidence', () => {
  it('keeps every bullet when there are no detections', () => {
    expect(filterRestatedEvidence([tier1, tier2, confirmed, finding], [])).toEqual([
      tier1,
      tier2,
      confirmed,
      finding,
    ]);
  });

  it('hides only the bullet whose tier a detection row already tells', () => {
    expect(filterRestatedEvidence([tier1, tier2, confirmed, finding], [ioc])).toEqual([
      tier2,
      finding,
    ]);
    expect(filterRestatedEvidence([tier1, tier2, confirmed, finding], [behavior])).toEqual([
      tier1,
      finding,
    ]);
    expect(filterRestatedEvidence([tier1, tier2, confirmed, finding], [ioc, behavior])).toEqual([
      finding,
    ]);
  });
});
