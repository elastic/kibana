/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Classification, TruthRecord } from './fake_llm';
import {
  resolveExcludedRules,
  percentile,
  buildScorecard,
  diffScorecards,
  ledgerRow,
  appendLedgerRow,
} from './report_run';

// Ten alerts. Truth: a1 to a5 false positive, a6 to a8 true positive, a9 a planted variant (true positive), a10 a harmless hash update.
const truth = new Map<string, TruthRecord>([
  ['a1', { verdict: 'false_positive', variant: null, benign: null }],
  ['a2', { verdict: 'false_positive', variant: null, benign: null }],
  ['a3', { verdict: 'false_positive', variant: null, benign: null }],
  ['a4', { verdict: 'false_positive', variant: null, benign: null }],
  ['a5', { verdict: 'false_positive', variant: null, benign: null }],
  ['a6', { verdict: 'true_positive', variant: null, benign: null }],
  ['a7', { verdict: 'true_positive', variant: null, benign: null }],
  ['a8', { verdict: 'true_positive', variant: null, benign: null }],
  ['a9', { verdict: 'true_positive', variant: 'new_hash', benign: null }],
  ['a10', { verdict: 'false_positive', variant: null, benign: 'hash_update' }],
]);

const T0 = '2026-11-16T10:00:00.000Z';
const tagged = (id: string, verdictTag: string, minutesAfterStart: number = 0) => ({
  id,
  timestamp: new Date(Date.parse(T0) + minutesAfterStart * 60000).toISOString(),
  tags: [verdictTag, 'az:triage_strict_key:abc'],
});

// What the model said about each alert: a6 is a true positive that got a false-positive verdict, a9 too (missed variant),
// a10 (harmless) got a true-positive verdict, a5 got inconclusive.
const alerts = [
  tagged('a1', 'az:false_positive'),
  tagged('a2', 'az:false_positive'),
  tagged('a3', 'az:false_positive'),
  tagged('a4', 'az:false_positive'),
  tagged('a5', 'az:inconclusive'),
  tagged('a6', 'az:false_positive'),
  tagged('a7', 'az:true_positive'),
  tagged('a8', 'az:true_positive'),
  tagged('a9', 'az:false_positive'),
  tagged('a10', 'az:true_positive'),
];

const promptOf = (ids: string[]) =>
  `Classify. The format is <alert id="..."> for each:\n${ids
    .map((id) => `<alert id="${id}">x</alert>`)
    .join('\n')}`;
const verdict = (id: string, classification: Classification, confidenceScore: number) => ({
  id,
  classification,
  confidence_score: confidenceScore,
});
const calls = [
  {
    startedAt: '2026-11-16T10:00:10.000Z',
    finishedAt: '2026-11-16T10:00:20.000Z',
    executionTimeMs: 10000,
    status: 'completed',
    prompt: promptOf(['a1', 'a2', 'a3', 'a4', 'a5']),
    verdicts: [
      verdict('a1', 'false_positive', 0.9),
      verdict('a2', 'false_positive', 0.9),
      verdict('a3', 'false_positive', 0.8),
      verdict('a4', 'false_positive', 0.95),
      verdict('a5', 'inconclusive', 0.5),
    ],
    inputTokens: 1000,
    outputTokens: 200,
    connectorId: 'fake',
  },
  {
    startedAt: '2026-11-16T10:00:30.000Z',
    finishedAt: '2026-11-16T10:30:30.000Z',
    executionTimeMs: 1800000,
    status: 'completed',
    prompt: promptOf(['a6', 'a7', 'a8', 'a9', 'a10']),
    verdicts: [
      verdict('a6', 'false_positive', 0.7),
      verdict('a7', 'true_positive', 0.95),
      verdict('a8', 'true_positive', 0.9),
      verdict('a9', 'false_positive', 0.9),
      verdict('a10', 'true_positive', 0.6),
    ],
    inputTokens: 1500,
    outputTokens: 300,
    connectorId: 'fake',
  },
  {
    startedAt: '2026-11-16T10:00:40.000Z',
    finishedAt: '2026-11-16T10:00:41.000Z',
    status: 'failed',
    prompt: '',
    verdicts: [],
  },
];
const sweeps = [
  { startedAt: '2026-11-16T10:00:00.000Z', output: { skip_reason: 'none', pending_alerts: 500 } },
  {
    startedAt: '2026-11-16T10:15:00.000Z',
    output: { skip_reason: 'in_flight_limit', pending_alerts: 480 },
  },
  { startedAt: '2026-11-16T10:30:00.000Z', output: { skip_reason: 'none', pending_alerts: 450 } },
];
const steps = [
  { workflowId: 'w', stepId: 'plan', status: 'completed', executionTimeMs: 100 },
  { workflowId: 'w', stepId: 'plan', status: 'completed', executionTimeMs: 300 },
  { workflowId: 'w', stepId: 'plan', status: 'failed', executionTimeMs: 50 },
  { workflowId: 'w', stepId: 'tag', status: 'completed', executionTimeMs: 1000 },
];

const scorecard = buildScorecard({ calls, sweeps, steps, alerts, truth });

describe('percentile', () => {
  it('takes the nearest rank, and gives null for no values', () => {
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(1);
    expect(percentile([], 0.5)).toBeNull();
  });
});

describe('buildScorecard', () => {
  it('counts the verdicts on the alerts against the truth', () => {
    expect(scorecard.verdicts.analyzed).toBe(10);
    expect(scorecard.verdicts.truthToVerdict).toEqual({
      'fp>fp': 4,
      'fp>inc': 1,
      'fp>tp': 1,
      'tp>fp': 2,
      'tp>tp': 2,
    });
  });

  it('counts a true positive that got a false-positive verdict, the wrong close that the plan wants at zero', () => {
    // a6 and a9 are true positives that got a false-positive verdict; a7, a8 got it right. a9 is also a planted variant.
    expect(scorecard.wrongFalsePositive).toEqual({
      truePositiveAlertsAnalyzed: 4,
      gotFalsePositive: 2,
      rate: 0.5,
    });
  });

  it('counts the planted variants that got a false-positive verdict, per type', () => {
    expect(scorecard.plantedVariants).toEqual({
      analyzed: 1,
      gotFalsePositive: 1,
      byType: { new_hash: { analyzed: 1, gotFalsePositive: 1 } },
    });
  });

  it('counts the harmless changes that the model took for a true positive', () => {
    expect(scorecard.benignHashUpdates).toEqual({ analyzed: 1, gotTruePositive: 1 });
  });

  it('ignores an alert that has no verdict tag or is not in the truth file', () => {
    const extra = [
      ...alerts,
      { id: 'a1', timestamp: T0, tags: ['az:triage_pending'] },
      tagged('unknown', 'az:false_positive'),
    ];
    const withExtra = buildScorecard({ calls, sweeps, steps, alerts: extra, truth });

    // The second `a1` has only a claim tag, and `unknown` has no truth: neither is a verdict that can be judged.
    expect(withExtra.verdicts.analyzed).toBe(10);
    expect(withExtra.verdicts.truthToVerdict).toEqual(scorecard.verdicts.truthToVerdict);
  });

  it('counts the model calls per 1,000 alerts from the completed calls only, and reports the failed ones apart', () => {
    expect(scorecard.llmCalls).toEqual({ calls: 3, failed: 1, per1000AlertsAnalyzed: 200 });
  });

  it('prices a batch at 5 units plus 1 per alert, and does not take the format example of the prompt for an alert', () => {
    // two completed calls of 5 alerts: 2 * (5 + 5) = 20. The `<alert id="...">` of the instructions is not an alert.
    expect(scorecard.costAndTokens.costUnits).toBe(20);
  });

  it('adds up the tokens the connector reported and lists the connectors that answered', () => {
    expect(scorecard.costAndTokens).toMatchObject({
      inputTokens: 2500,
      outputTokens: 500,
      connectorIds: ['fake'],
    });
  });

  it('gives the confidence by answer type and how many reach the cache threshold', () => {
    expect(scorecard.confidence['fp>fp']).toMatchObject({
      count: 4,
      mean: 0.8875,
      shareAtOrAboveCacheThreshold: 0.75,
    });
    // a wrong answer is less sure here: the two true positives that got a false-positive verdict have 0.7 and 0.9
    expect(scorecard.confidence['tp>fp']).toMatchObject({
      count: 2,
      mean: 0.8,
      shareAtOrAboveCacheThreshold: 0.5,
    });
  });

  it('measures the time from the alert to the verdict of its batch', () => {
    // all alerts are dated T0. The first batch finished 20 s later, the second 30 minutes and 30 s later.
    expect(scorecard.creationToVerdictSeconds).toEqual({ p50: 20, p95: 1830 });
  });

  it('gives verdicts per hour over the time of the calls, and the backlog of the last sweep', () => {
    // 10 verdicts between 10:00:10 and 10:30:30 = 1820 s
    expect(scorecard.throughput.verdictsPerHour).toBeCloseTo((10 / 1820) * 3600, 0);
    expect(scorecard.throughput.backlogAtEnd).toBe(450);
  });

  it('counts the sweeps per skip reason, because a skipped sweep is the throughput limit', () => {
    expect(scorecard.sweepSkipReasons).toEqual({ none: 2, in_flight_limit: 1 });
  });

  it('gives the step time per step with failed steps counted and left out of the percentiles', () => {
    expect(scorecard.stepTimes['w/plan']).toEqual({
      count: 3,
      failed: 1,
      p50Ms: 100,
      p95Ms: 300,
      totalMs: 400,
    });
    expect(Object.keys(scorecard.stepTimes)[0]).toBe('w/tag'); // the biggest total first
  });
});

describe('diffScorecards', () => {
  it('gives current, baseline and difference for every number that both have', () => {
    const baseline = {
      ...scorecard,
      llmCalls: { ...scorecard.llmCalls, per1000AlertsAnalyzed: 150 },
    };
    const diff = diffScorecards(scorecard, baseline);

    expect(diff['llmCalls.per1000AlertsAnalyzed']).toEqual({
      current: 200,
      baseline: 150,
      difference: 50,
    });
    expect(diff['wrongFalsePositive.rate']).toEqual({ current: 0.5, baseline: 0.5, difference: 0 });
  });
});

describe('ledger', () => {
  const base = {
    runId: 'r1',
    date: '2026-11-16',
    commit: 'abc',
    flags: 'all off',
    seed: 1,
    slice: '2 h',
    scorecard,
    note: '',
  };

  it('marks the numbers of a fake run as estimates and carries the fake settings', () => {
    const row = ledgerRow({
      ...base,
      llm: { mode: 'fake', connectorIds: ['fake'], fakeSettings: { flipRate: 0.06 } },
    });

    expect(row).toContain('2500 / 500 (est.)');
    expect(row).toContain('20 (est.)');
    expect(row).toContain('"flipRate":0.06');
  });

  it('does not mark the numbers of a real run as estimates, and names the connector', () => {
    const row = ledgerRow({
      ...base,
      llm: { mode: 'real', connectorIds: ['.anthropic-claude-4.5-haiku-chat_completion'] },
    });

    expect(row).not.toContain('(est.)');
    expect(row).toContain('real: .anthropic-claude-4.5-haiku-chat_completion');
  });

  it('adds the header with the first row, and appends to the ledger after that', () => {
    const row1 = ledgerRow({ ...base, runId: 'r1', llm: { mode: 'fake', connectorIds: [] } });
    const row2 = ledgerRow({ ...base, runId: 'r2', llm: { mode: 'fake', connectorIds: [] } });
    const first = appendLedgerRow('# Results\n', row1, 'r1');
    const second = appendLedgerRow(first, row2, 'r2');

    expect(first).toContain('## Scorecard ledger');
    expect(second.match(/## Scorecard ledger/g)).toHaveLength(1);
    expect(second.indexOf('| r1 |')).toBeLessThan(second.indexOf('| r2 |'));
  });

  it('refuses a run id that is already in the ledger, because a row is never overwritten', () => {
    const row = ledgerRow({ ...base, llm: { mode: 'fake', connectorIds: [] } });
    const once = appendLedgerRow('# Results\n', row, 'r1');

    expect(() => appendLedgerRow(once, row, 'r1')).toThrow('already in the ledger');
  });
});

describe('excluded rules', () => {
  // a6 (a true positive that got false positive) and a9 (a planted variant that was missed) belong to the rule that is left out.
  const ruled = new Map(
    [...truth].map(([id, t]) => [
      id,
      { ...t, ruleUuid: id === 'a6' || id === 'a9' ? 'rule-x' : 'rule-y' },
    ])
  );
  const excluded = buildScorecard({
    calls,
    sweeps,
    steps,
    alerts,
    truth: ruled,
    excludeRules: new Set(['rule-x']),
  });

  it('leaves the alerts of an excluded rule out of the wrong-verdict metric, the planted variants and the harmless changes', () => {
    // Without the exclusion 2 of 4 true positives got a false-positive verdict. Without a6 and a9: 0 of 2.
    expect(excluded.wrongFalsePositive).toEqual({
      truePositiveAlertsAnalyzed: 2,
      gotFalsePositive: 0,
      rate: 0,
    });
    expect(excluded.plantedVariants).toMatchObject({ analyzed: 0, gotFalsePositive: 0 });
    expect(excluded.benignHashUpdates).toEqual({ analyzed: 1, gotTruePositive: 1 });
  });

  it('still counts them in the verdict matrix, and says how many are in the metric', () => {
    expect(excluded.verdicts.analyzed).toBe(10);
    expect(excluded.verdicts.analyzedInMetric).toBe(8);
    expect(excluded.verdicts.truthToVerdict).toEqual(scorecard.verdicts.truthToVerdict);
  });

  it('reports the excluded rule apart, so that the exclusion cannot hide the result', () => {
    expect(excluded.excludedRules).toEqual({
      'rule-x': { analyzed: 2, truthToVerdict: { 'tp>fp': 2 } },
    });
  });

  it('changes nothing when no rule is excluded', () => {
    const same = buildScorecard({ calls, sweeps, steps, alerts, truth: ruled });

    expect(same.wrongFalsePositive).toEqual(scorecard.wrongFalsePositive);
    expect(same.excludedRules).toEqual({});
  });
});

describe('resolveExcludedRules', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
  fs.writeFileSync(
    path.join(dir, 'rules.json'),
    JSON.stringify([
      { uuid: 'u1', name: 'AWS S3 Rapid Bucket Posture API Calls from a Single Principal' },
      { uuid: 'u2', name: 'AWS S3 Bucket Enumeration or Brute Force' },
    ])
  );

  it('takes a rule by its exact name or its uuid', () => {
    const byName = resolveExcludedRules(dir, [
      'AWS S3 Rapid Bucket Posture API Calls from a Single Principal',
    ]);

    expect([...byName.uuids]).toEqual(['u1']);
    expect([...resolveExcludedRules(dir, ['u2']).uuids]).toEqual(['u2']);
  });

  it('does not take another rule with a part of a name, and fails loudly for a name that matches no rule', () => {
    expect(() => resolveExcludedRules(dir, ['AWS S3'])).toThrow(
      'no rule has the exact name or uuid "AWS S3"'
    );
  });
});
