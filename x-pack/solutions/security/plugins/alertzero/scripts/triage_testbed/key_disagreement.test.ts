/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { hashKey } from '../../server/alert_triage/key_tags';
import { buildPatternKeys } from '../../server/alert_triage/pattern_key';
import {
  buildCacheDocument,
  nextCacheAction,
  type CacheAction,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import {
  causeOf,
  outcomeOf,
  pairsFromRecords,
  pairsFromRun,
  readAnswers,
  readRunAlerts,
  summarizePairs,
  type Answer,
  type KeyPair,
  type RunAlert,
  type Truth,
} from './key_disagreement';
import type { EsRequest } from './report_run';

const fp = (confidence = 0.95): Answer => ({ classification: 'false_positive', confidence });
const tp = (confidence = 0.95): Answer => ({ classification: 'true_positive', confidence });
const inconclusive: Answer = { classification: 'inconclusive', confidence: 0.9 };

const pair = (
  run1: Answer,
  run2: Answer,
  truth1: Truth = 'false_positive',
  truth2: Truth = 'false_positive',
  kind = 'process'
): KeyPair => ({
  kind,
  run1: { answer: run1, truth: truth1 },
  run2: { answer: run2, truth: truth2 },
});

describe('outcomeOf', () => {
  it('makes no record when run 1 is not a confident false or true positive', () => {
    expect(outcomeOf(pair(inconclusive, fp()))).toBe('no_record');
    expect(outcomeOf(pair(fp(0.8), fp()))).toBe('no_record');
  });

  it('activates the record when run 2 has the same verdict at the floor, and the floor itself counts', () => {
    expect(outcomeOf(pair(fp(), fp()))).toBe('activates');
    expect(outcomeOf(pair(fp(0.85), fp(0.85)))).toBe('activates');
    expect(outcomeOf(pair(tp(), tp()))).toBe('activates');
  });

  it('makes the key unstable when run 2 has another verdict, or is inconclusive or under the floor', () => {
    expect(outcomeOf(pair(fp(), tp()))).toBe('verdicts_differ');
    expect(outcomeOf(pair(fp(), inconclusive))).toBe('run2_not_confident');
    expect(outcomeOf(pair(fp(), fp(0.84)))).toBe('run2_not_confident');
  });
});

describe('causeOf', () => {
  it('blames the key when the two alerts have a different truth, whatever the model said', () => {
    expect(causeOf(pair(fp(), tp(), 'false_positive', 'true_positive'))).toBe('coarse_key');
    expect(causeOf(pair(fp(), inconclusive, 'false_positive', 'true_positive'))).toBe('coarse_key');
  });

  it('blames the model when the truth is the same and the verdicts differ', () => {
    expect(causeOf(pair(fp(), tp()))).toBe('model_noise');
  });

  it('blames the confidence gate when the truth is the same and run 2 is not confident', () => {
    expect(causeOf(pair(fp(), fp(0.6)))).toBe('confidence_gate');
    expect(causeOf(pair(fp(), inconclusive))).toBe('confidence_gate');
  });

  it('has no cause for a key that activates or never started a record', () => {
    expect(causeOf(pair(fp(), fp()))).toBeUndefined();
    expect(causeOf(pair(inconclusive, fp()))).toBeUndefined();
  });
});

describe('summarizePairs', () => {
  const report = summarizePairs([
    pair(fp(), fp()),
    pair(fp(), fp()),
    pair(fp(), tp(), 'false_positive', 'false_positive'),
    pair(fp(), fp(0.5), 'false_positive', 'false_positive', 'cloud'),
    pair(fp(), tp(), 'false_positive', 'true_positive', 'cloud'),
    pair(inconclusive, fp()),
    // Both runs agree on a false positive, but the second alert is a true positive: a record on a mixed key.
    pair(fp(), fp(), 'false_positive', 'true_positive'),
    pair(tp(), tp(), 'true_positive', 'false_positive', 'file'),
  ]);

  it('counts the keys, the keys with a record, and the share that became unstable', () => {
    expect(report.overall).toMatchObject({
      pairs: 8,
      noRecord: 1,
      withRecord: 7,
      activates: 4,
      unstable: 3,
      unstableShare: 0.4286,
    });
  });

  it('splits the unstable keys by cause', () => {
    expect(report.overall.causes).toEqual({ coarse_key: 1, model_noise: 1, confidence_gate: 1 });
  });

  it('counts the dangerous case: a record that is active on a mixed key, and the false positive record on a true positive', () => {
    expect(report.overall).toMatchObject({
      activatesOnMixedKey: 2,
      activatesFalsePositiveOnTruePositive: 1,
    });
  });

  it('gives the same figures by kind of key', () => {
    expect(report.byKind.cloud).toMatchObject({
      pairs: 2,
      unstable: 2,
      causes: { coarse_key: 1, model_noise: 0, confidence_gate: 1 },
    });
    expect(report.byKind.file).toMatchObject({ activates: 1, activatesOnMixedKey: 1 });
  });

  it('has no share when no key had a record, instead of dividing by zero', () => {
    expect(summarizePairs([pair(inconclusive, fp())]).overall.unstableShare).toBeNull();
    expect(summarizePairs([]).overall).toMatchObject({ pairs: 0, unstableShare: null });
  });

  it('records the floor that it used', () => {
    expect(summarizePairs([pair(fp(0.9), fp(0.9))], 0.95).overall.noRecord).toBe(1);
    expect(summarizePairs([], 0.95).floor).toBe(0.95);
  });
});

describe('pairsFromRun', () => {
  const doc = (executable: string): Record<string, unknown> => ({
    'kibana.alert.rule.uuid': 'rule-1',
    'kibana.alert.rule.revision': 1,
    'host.os.type': 'windows',
    'process.executable': executable,
    'process.code_signature.subject_name': 'Acme',
  });
  const strictKey = (executable: string): string => {
    const { strict } = buildPatternKeys(doc(executable));
    if (strict === undefined) throw new Error('no strict key');
    return strict;
  };
  const alert = (
    id: string,
    executable: string | undefined,
    riskScore: number,
    minute: number,
    truth: Truth = 'false_positive'
  ): RunAlert => ({
    id,
    strictKey: executable === undefined ? undefined : strictKey(executable),
    riskScore,
    timestamp: Date.parse('2026-11-15T10:00:00Z') + minute * 60_000,
    truth,
  });
  const answers = (ids: string[], answer: Answer = fp()) => new Map(ids.map((id) => [id, answer]));

  it('takes the first two alerts of a key in the order of the cache: risk score, then oldest, then id', () => {
    const [result] = pairsFromRun(
      [
        alert('c', 'a.exe', 21, 1),
        alert('b', 'a.exe', 73, 9, 'true_positive'),
        alert('a', 'a.exe', 73, 5),
      ],
      new Map([
        ['a', fp()],
        ['b', tp()],
        ['c', inconclusive],
      ])
    );

    // `a` and `b` have the highest risk. `a` is older, so it is run 1. `b` is run 2. `c` is not used.
    expect(result.run1).toEqual({ answer: fp(), truth: 'false_positive' });
    expect(result.run2).toEqual({ answer: tp(), truth: 'true_positive' });
  });

  it('gives the kind of the key and leaves out a key with one alert, an alert without a key, and an alert without an answer', () => {
    const result = pairsFromRun(
      [
        alert('one', 'solo.exe', 21, 1),
        alert('p1', 'pair.exe', 21, 1),
        alert('p2', 'pair.exe', 21, 2),
        alert('n1', undefined, 21, 1),
        alert('n2', undefined, 21, 2),
        alert('u1', 'unanswered.exe', 21, 1),
        alert('u2', 'unanswered.exe', 21, 2),
      ],
      answers(['one', 'p1', 'p2', 'n1', 'n2', 'u1'])
    );

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('process');
  });
});

describe('readAnswers', () => {
  it('reads the classification and the confidence of every verdict in the window, by the id or the alert id', async () => {
    const request = jest.fn(async () => ({
      hits: {
        hits: [
          {
            _source: {
              output: {
                content: {
                  verdicts: [
                    { id: 'a', classification: 'false_positive', confidence_score: 0.9 },
                    { alert_id: 'b', classification: 'true_positive' },
                    { classification: 'inconclusive', confidence_score: 0.5 },
                  ],
                },
              },
            },
          },
          { _source: {} },
        ],
      },
    })) as unknown as EsRequest;

    const answers = await readAnswers(request, { from: 'x', to: 'y' });

    expect([...answers]).toEqual([
      ['a', { classification: 'false_positive', confidence: 0.9 }],
      ['b', { classification: 'true_positive', confidence: 0 }],
    ]);
  });
});

describe('reading files and records', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'disagreement-'));
  afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));
  const sourceOf = (executable: string) => ({
    '@timestamp': '2026-11-15T10:00:00.000Z',
    'kibana.alert.risk_score': 21,
    'kibana.alert.rule.uuid': 'rule-1',
    'kibana.alert.rule.revision': 1,
    'host.os.type': 'windows',
    'process.executable': executable,
    'process.code_signature.subject_name': 'Acme',
  });

  it('reads the alerts of a folder with their key, risk score and truth, and refuses an alert without truth', async () => {
    fs.writeFileSync(
      path.join(folder, 'alerts.ndjson'),
      `${JSON.stringify({ _id: 'a', _source: sourceOf('a.exe') })}\n`
    );
    fs.writeFileSync(
      path.join(folder, 'truth.ndjson'),
      `${JSON.stringify({ id: 'a', verdict: 'true_positive' })}\n`
    );

    const [alert] = await readRunAlerts(folder);

    expect(alert).toMatchObject({ id: 'a', riskScore: 21, truth: 'true_positive' });
    expect(alert.strictKey).toBe(buildPatternKeys(sourceOf('a.exe')).strict);
    fs.writeFileSync(path.join(folder, 'truth.ndjson'), '');
    await expect(readRunAlerts(folder)).rejects.toThrow('has no truth record');
  });

  it('reads the records of the shadow run that got a second run, with the truth of both alerts, and leaves out a pending record', async () => {
    const strictOf = (executable: string): string => {
      const { strict } = buildPatternKeys(sourceOf(executable));
      if (strict === undefined) throw new Error('no strict key');
      return strict;
    };
    const written = (action: CacheAction): VerdictCacheRecord => {
      if (action.type !== 'write') throw new Error('expected a write');
      return action.record;
    };
    const recordOf = (executable: string, second?: [string, string]): VerdictCacheRecord => {
      const base = {
        keyHash: hashKey('default', strictOf(executable)),
        strictKey: strictOf(executable),
        floor: 0.85,
        now: new Date('2026-11-18T12:00:00.000Z'),
      };
      const first = written(
        nextCacheAction({
          existing: undefined,
          fresh: {
            alertId: `${executable}-1`,
            classification: 'false_positive',
            confidenceScore: 0.95,
          },
          ...base,
        })
      );
      return second === undefined
        ? first
        : written(
            nextCacheAction({
              existing: first,
              fresh: {
                alertId: `${executable}-2`,
                classification: second[0],
                confidenceScore: Number(second[1]),
              },
              ...base,
            })
          );
    };
    const records = [
      recordOf('a.exe', ['false_positive', '0.95']),
      recordOf('b.exe', ['true_positive', '0.95']),
      recordOf('c.exe'),
    ];
    fs.writeFileSync(
      path.join(folder, 'truth.ndjson'),
      [
        ['a.exe-1', 'false_positive'],
        ['a.exe-2', 'false_positive'],
        ['b.exe-1', 'false_positive'],
        ['b.exe-2', 'true_positive'],
        ['c.exe-1', 'false_positive'],
      ]
        .map(([id, verdict]) => JSON.stringify({ id, verdict }))
        .join('\n')
    );
    const request = jest.fn(async (_method: string, url: string) => {
      if (url === '/.workflows-step-executions/_search') return { hits: { hits: [] } };
      return {
        hits: {
          hits: records.map((record) => ({
            _source: buildCacheDocument({ record, spaceId: 'default', now: new Date() }),
          })),
        },
      };
    }) as unknown as EsRequest;

    const pairs = await pairsFromRecords(request, { from: 'x', to: 'y' }, folder);

    expect(pairs).toHaveLength(2);
    expect(pairs.map(({ run2 }) => run2.truth).sort()).toEqual(['false_positive', 'true_positive']);
    expect(summarizePairs(pairs).overall).toMatchObject({ activates: 1, unstable: 1 });
    expect(summarizePairs(pairs).overall.causes.coarse_key).toBe(1);
  });
});
