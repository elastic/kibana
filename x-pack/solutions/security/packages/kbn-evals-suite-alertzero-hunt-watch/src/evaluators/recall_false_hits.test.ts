/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createFalseHitRateEvaluator,
  createSeededHitRecallTier1Evaluator,
  createSeededHitRecallTier2Evaluator,
  type HuntRunRecord,
} from './recall_false_hits';
import { loadManifest, loadSamples } from '../fixtures/load_corpus';
import { buildLabels } from '../datasets/labels';
import type { CoordinatorRun } from '../types';

const manifest = loadManifest();
const samples = loadSamples();
const labels = buildLabels({ manifest, samples });

const baseRun: CoordinatorRun = {
  tier1_status: 'environment_hits_found',
  behaviours: [
    {
      executed: true,
      hit: true,
      technique_id: 'T1003.001',
      hits: [{ _id: '00140285#0#positive', _index: '.ds-logs-endpoint.events.process-default' }],
    },
  ],
  completeness: 'complete',
  tier2_when: 'always',
};

const record = (overrides: Partial<CoordinatorRun> = {}): HuntRunRecord => ({
  runKey: 'R-beh[bits-mshta]',
  phase: 'E+',
  reportClass: 'R-beh-A',
  sampleBase: '00140285',
  run: { ...baseRun, ...overrides },
  tier1HitIds: [],
  tier2HitIds: (overrides.behaviours ?? baseRun.behaviours).flatMap((b) =>
    (b.hits ?? []).map((h) => h._id)
  ),
  tier1MatchedIocs: [],
});

const metadata = {
  labels,
  noise: ['noise#0#doc'],
  twinChanged: [],
  twinRetained: [],
  foreign: [],
  fixture: ['logs-ti_abusech.url#0#fixture'],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const eval_ = async (e: any, rec: HuntRunRecord): Promise<{ score: number | null }> =>
  e.evaluate({ output: rec, metadata, input: undefined, expected: undefined });

describe('M1/M2 CODE evaluator wiring (spec-level mutation proof)', () => {
  it('Tier 2 recall scores a planted, technique-matched, id-matched hit as found', async () => {
    const score = await eval_(createSeededHitRecallTier2Evaluator(), record());
    expect(score.score).not.toBeNull();
    expect(score.score as number).toBeGreaterThan(0);
  });

  it('MUTANT: behaviour hit ids swapped to noise must score 0 (design v1 §4 mutation proof)', async () => {
    const swapped = record({
      behaviours: [
        {
          executed: true,
          hit: true,
          technique_id: 'T1003.001',
          hits: [{ _id: 'noise#0#doc', _index: '.ds-logs-endpoint.events.process-default' }],
        },
      ],
    });
    swapped.tier2HitIds = ['noise#0#doc'];
    const base = await eval_(createSeededHitRecallTier2Evaluator(), record());
    const mutant = await eval_(createSeededHitRecallTier2Evaluator(), swapped);
    expect(base.score).not.toBeNull();
    expect(mutant.score).toBe(0);
    expect(base.score).not.toEqual(mutant.score);
  });

  it('Tier 1 recall reflects matched planted IoCs only', async () => {
    const planted = labels.plantedIocs[0];
    expect(planted).toBeDefined();
    const withIoc = record();
    withIoc.tier1MatchedIocs = [{ value: planted.value, hitIds: [planted.docIds[0]] }];
    const score = await eval_(createSeededHitRecallTier1Evaluator(), withIoc);
    expect(score.score).toBe(1 / labels.plantedIocs.length);
    const none = await eval_(createSeededHitRecallTier1Evaluator(), record());
    expect(none.score).toBe(0);
  });

  it('M2 false-hit rate classifies a noise hit id as false', async () => {
    const noiseHit = record();
    noiseHit.tier2HitIds = ['noise#0#doc'];
    noiseHit.run = {
      ...baseRun,
      behaviours: [
        {
          executed: true,
          hit: true,
          technique_id: 'T1003.001',
          hits: [{ _id: 'noise#0#doc', _index: '.ds-logs-endpoint.events.process-default' }],
        },
      ],
    };
    const score = await eval_(createFalseHitRateEvaluator(), noiseHit);
    expect(score.score).toBe(1);
  });

  it('M2 returns null (undefined) for a run with no hits', async () => {
    const noHits = record({
      tier1_status: 'no_environment_hits',
      behaviours: [{ executed: true, hit: false }],
    });
    noHits.tier2HitIds = [];
    const score = await eval_(createFalseHitRateEvaluator(), noHits);
    expect(score.score).toBeNull();
  });
});
