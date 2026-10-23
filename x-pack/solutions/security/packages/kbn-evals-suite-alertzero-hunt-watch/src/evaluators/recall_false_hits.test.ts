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

const CHAIN = labels.chainOf['00140285'];
expect(CHAIN).toBeDefined();

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
  chain: CHAIN,
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

/** All chain-scoped, scorable planted behaviours (the T2 denominator). */
const scorableInChain = () =>
  labels.plantedBehaviours.filter((p) => p.chain === CHAIN && p.techniques.length > 0);

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

  it('Tier 1 recall reflects matched planted IoCs only, scoped to the report values', async () => {
    const planted = labels.plantedIocs[0];
    expect(planted).toBeDefined();
    const chainOfPlanted = labels.chainOf[planted.docIds[0].split('#')[0]];
    const withIoc = record();
    withIoc.reportClass = 'R-ioc';
    withIoc.chain = chainOfPlanted;
    const requested = labels.plantedIocs
      .filter((p) => labels.chainOf[p.docIds[0].split('#')[0]] === chainOfPlanted)
      .map((p) => p.value);
    withIoc.reportIocValues = requested;
    withIoc.tier1MatchedIocs = [{ value: planted.value, hitIds: [planted.docIds[0]] }];
    const score = await eval_(createSeededHitRecallTier1Evaluator(), withIoc);
    expect(score.score).toBe(1 / requested.length);
    const none = await eval_(createSeededHitRecallTier1Evaluator(), withIoc);
    void none;
    const noMatch = record();
    noMatch.reportClass = 'R-ioc';
    noMatch.chain = chainOfPlanted;
    noMatch.reportIocValues = withIoc.reportIocValues;
    const zero = await eval_(createSeededHitRecallTier1Evaluator(), noMatch);
    expect(zero.score).toBe(0);
  });

  it('M1 applicability: non-E+ phases and non-requesting reports score null, not 0', async () => {
    const t1 = createSeededHitRecallTier1Evaluator();
    const t2 = createSeededHitRecallTier2Evaluator();
    // E0: positives are not seeded; a clean run must not dilute recall. The
    // R-ioc record makes this non-vacuous: without the phase guard it would
    // score 0 against its own requested IoCs.
    const planted = labels.plantedIocs[0];
    const chainOfPlanted = labels.chainOf[planted.docIds[0].split('#')[0]];
    const rIocE0 = record();
    rIocE0.phase = 'E0';
    rIocE0.reportClass = 'R-ioc';
    rIocE0.chain = chainOfPlanted;
    rIocE0.reportIocValues = labels.plantedIocs
      .filter((p) => labels.chainOf[p.docIds[0].split('#')[0]] === chainOfPlanted)
      .map((p) => p.value);
    rIocE0.tier1MatchedIocs = [];
    expect((await eval_(t1, rIocE0)).score).toBeNull();
    const e0 = record();
    e0.phase = 'E0';
    expect((await eval_(t2, e0)).score).toBeNull();
    // R-beh carries no IoCs: tier 1 is not applicable.
    expect((await eval_(t1, record())).score).toBeNull();
    // R-ioc carries no behavioural text: tier 2 is not applicable.
    const rIoc = record();
    rIoc.reportClass = 'R-ioc';
    expect((await eval_(t2, rIoc)).score).toBeNull();
  });

  it("M1-T2 scoping: other chains' positives never enter this report's denominator", async () => {
    const rec = record();
    // The report recalls its own chain's first behaviour's doc...
    const ownPlanted = labels.plantedBehaviours.find(
      (p) => p.chain === CHAIN && p.techniques.length > 0
    );
    expect(ownPlanted).toBeDefined();
    const score = await eval_(createSeededHitRecallTier2Evaluator(), rec);
    // Denominator is the chain's scorable steps, not the whole corpus.
    expect(score.score).toBe(1 / scorableInChain().length);
    // Whole-corpus denominator would be strictly larger (regression guard).
    expect(labels.plantedBehaviours.length).toBeGreaterThan(scorableInChain().length);
  });

  it('M1-T2: an infra skip before any behaviour executed is INVALID, not recall 0', async () => {
    // Connector/inference plumbing died (or the report text was missing)
    // before the model ever ran: recall is undefined, not zero. Every reason
    // in the infra set must null the cell; only genuinely model-chargeable
    // skips may keep scoring.
    for (const reason of [
      'no_report_text',
      'no_inference',
      'no_connector',
      'no_inference_plugin',
      'scope_blocked',
      'no_searchable_input',
    ]) {
      const rec = record({ behaviours: [], tier2_skipped_reason: reason });
      rec.tier2HitIds = [];
      const verdict = await eval_(createSeededHitRecallTier2Evaluator(), rec);
      expect(verdict.score).toBeNull();
    }
    // The same flags with behaviours that DID execute still score on them:
    // the guard only fires when nothing executed.
    const partial = record({
      behaviours: [],
      tier2_skipped_reason: 'no_connector',
    });
    partial.run = {
      ...partial.run,
      behaviours: [
        {
          executed: true,
          hit: true,
          technique_id: 'T1003.001',
          hits: [
            { _id: '00140285#0#positive', _index: '.ds-logs-endpoint.events.process-default' },
          ],
        },
      ],
    };
    partial.tier2HitIds = ['00140285#0#positive'];
    const partialScore = await eval_(createSeededHitRecallTier2Evaluator(), partial);
    expect(partialScore.score).not.toBeNull();

    // Model-chargeable skips stay scoreable: tier2_failed (ambiguous
    // connector-504 vs model refusal) and no_tier2_targets (the model
    // resolved a dataset with no behavioural rows) are honest recall 0.
    const failed = record({ behaviours: [], tier2_skipped_reason: 'tier2_failed' });
    failed.tier2HitIds = [];
    expect((await eval_(createSeededHitRecallTier2Evaluator(), failed)).score).toBe(0);
    const noTargets = record({ behaviours: [], tier2_skipped_reason: 'no_tier2_targets' });
    noTargets.tier2HitIds = [];
    expect((await eval_(createSeededHitRecallTier2Evaluator(), noTargets)).score).toBe(0);
  });

  it('M2: a Tier 1 IoC hit on a planted positive with no Tier 2 behaviours is true, not false', async () => {
    // Regression (Libra): the old code classified every hit against
    // behaviours[0].technique_id, so a lone Tier 1 hit got technique '' and
    // scored as an off-technique false hit.
    const rec = record({ behaviours: [] });
    rec.tier1HitIds = ['00140285#0#positive'];
    rec.tier1MatchedIocs = [];
    const score = await eval_(createFalseHitRateEvaluator(), rec);
    expect(score.score).toBe(0);
  });

  it('M2: a later behaviour is judged against its own technique, not the first one', async () => {
    // Find two samples with distinct techniques in the same chain.
    const chainSteps = labels.plantedBehaviours.filter(
      (p) => p.chain === CHAIN && p.techniques.length > 0
    );
    const first = chainSteps[0];
    const other = chainSteps.find((p) => p !== first);
    if (!other) return; // single-step chain: nothing to prove here
    // First behaviour misses; the later behaviour hits its own technique's doc.
    const rec = record({
      behaviours: [
        { executed: true, hit: false, technique_id: first.techniques[0], hits: [] },
        {
          executed: true,
          hit: true,
          technique_id: other.techniques[0],
          hits: other.positiveDocIds.map((id) => ({
            _id: id,
            _index: '.ds-logs-endpoint.events.process-default',
          })),
        },
      ],
    });
    rec.tier2HitIds = rec.run.behaviours!.flatMap((b) => (b.hits ?? []).map((h) => h._id));
    const score = await eval_(createFalseHitRateEvaluator(), rec);
    // Under the old first-behaviour technique these hits were off-technique
    // false hits; under their own technique they are true.
    expect(score.score).toBe(0);
  });

  it('M2: duplicate hits across tiers count once (all-false scores 1, not 0.5)', async () => {
    const rec = record({ behaviours: [] });
    rec.tier1HitIds = ['noise#0#doc'];
    rec.run = {
      ...rec.run,
      behaviours: [
        {
          executed: true,
          hit: true,
          technique_id: 'T1003.001',
          hits: [{ _id: 'noise#0#doc', _index: '.ds-logs-endpoint.events.process-default' }],
        },
      ],
    };
    rec.tier2HitIds = ['noise#0#doc'];
    const score = await eval_(createFalseHitRateEvaluator(), rec);
    expect(score.score).toBe(1);
  });
});
