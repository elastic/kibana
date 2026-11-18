/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  WORDING_NAMES,
  alertInput,
  areaUnderCurve,
  buildJevReport,
  makeDecide,
  readSample,
  scoreAlerts,
  type AlertTruthRecord,
  type Decide,
  type SampleAlert,
  type ScoredAlert,
  type WordingName,
} from './jev_experiment';

const truthOf = (
  verdict: AlertTruthRecord['verdict'],
  extra: Partial<AlertTruthRecord> = {}
): AlertTruthRecord => ({ verdict, variant: null, benign: null, kind: 'process', ...extra });

/** A scored alert with the same score in every wording and every repeat, unless `scores` says otherwise. */
const scored = (
  id: string,
  truth: AlertTruthRecord,
  score: number,
  extra: Partial<ScoredAlert> = {}
): ScoredAlert => ({
  id,
  truth,
  keyed: 'repeated',
  scores: { choice: [score, score], benign: [score, score], indicator: [score, score] },
  latenciesMs: [100, 200],
  ...extra,
});

describe('alertInput', () => {
  it('shows the fields of the Alert Analysis prompt, and leaves out the workflow tags that can hold a verdict', () => {
    const input = alertInput({
      'kibana.alert.rule.name': 'Rule One',
      'kibana.alert.workflow_tags': ['az:true_positive'],
      process: { command_line: 'a.exe -x', executable: 'C:\\a.exe' },
      'host.name': 'host-1',
      'unlisted.field': 'secret',
    });

    expect(input).toContain('- kibana.alert.rule.name: Rule One');
    expect(input).toContain('- process.command_line: a.exe -x');
    expect(input).toContain('- host.name: host-1');
    expect(input).not.toContain('az:true_positive');
    expect(input).not.toContain('unlisted');
  });

  it('cuts a long value, so that one field cannot grow the input without limit', () => {
    const input = alertInput({ process: { command_line: 'x'.repeat(5000) } });

    expect(input.length).toBeLessThan(2200);
    expect(input).toContain('...');
  });
});

describe('areaUnderCurve', () => {
  it('is 1 when every attack scores above every benign alert, 0 when it is the other way round, and 0.5 for ties', () => {
    const rows = (attack: number, benign: number) => [
      { score: attack, positive: true },
      { score: benign, positive: false },
    ];
    expect(areaUnderCurve(rows(0.9, 0.1))).toBe(1);
    expect(areaUnderCurve(rows(0.1, 0.9))).toBe(0);
    expect(areaUnderCurve(rows(0.5, 0.5))).toBe(0.5);
  });

  it('has no value when one class is missing', () => {
    expect(areaUnderCurve([{ score: 0.9, positive: true }])).toBeNull();
  });
});

describe('buildJevReport: lanes', () => {
  const alerts = [
    // benign lane (0.05): one attack hides in it
    scored('b1', truthOf('false_positive'), 0.01),
    scored('b2', truthOf('false_positive'), 0.02),
    scored('b3', truthOf('false_positive'), 0.03),
    scored('hidden', truthOf('true_positive'), 0.04),
    // middle band
    scored('m1', truthOf('false_positive'), 0.5),
    // attack lane
    scored('a1', truthOf('true_positive'), 0.99),
    scored('a2', truthOf('false_positive'), 0.995),
  ];

  const [lane05, lane15] = buildJevReport({ alerts }).perWording.choice.overall.lanes;

  it('splits the alerts into the benign lane, the middle band and the attack lane', () => {
    expect(lane05).toMatchObject({
      benignLane: 4,
      middle: 1,
      attackLane: 2,
      shareAtExtremes: 0.8571,
    });
  });

  it('reports the attack inside the benign lane, the dangerous error, and the attacks found in the attack lane', () => {
    expect(lane05).toMatchObject({
      benignLaneTruePositives: 1,
      benignLaneTruePositiveShare: 0.25,
      attackLaneFalsePositives: 1,
      attacksFoundShare: 0.5,
    });
  });

  it('calls a benign lane usable only when it is clean enough and big enough', () => {
    expect(lane05.benignLaneUsable).toBe(false);
    const clean = buildJevReport({
      alerts: [
        ...Array.from({ length: 4 }, (_unused, i) =>
          scored(`c${i}`, truthOf('false_positive'), 0.01)
        ),
        scored('x', truthOf('true_positive'), 0.9),
        scored('y', truthOf('false_positive'), 0.6),
      ],
    }).perWording.choice.overall.lanes[0];
    expect(clean.benignLaneUsable).toBe(true);
    const small = buildJevReport({
      alerts: [
        scored('only', truthOf('false_positive'), 0.01),
        ...Array.from({ length: 5 }, (_unused, i) =>
          scored(`m${i}`, truthOf('true_positive'), 0.6)
        ),
      ],
    }).perWording.choice.overall.lanes[0];
    expect(small).toMatchObject({ benignLaneTruePositiveShare: 0, benignLaneUsable: false });
  });

  it('puts a score of exactly 0.05 in the benign lane and exactly 0.98 in the attack lane, and exactly 0.5 on the attack side', () => {
    const [lane] = buildJevReport({
      alerts: [
        scored('low', truthOf('false_positive'), 0.05),
        scored('high', truthOf('true_positive'), 0.98),
      ],
    }).perWording.choice.overall.lanes;
    expect(lane).toMatchObject({ benignLane: 1, attackLane: 1, middle: 0 });

    const { agreementWithTruth } = buildJevReport({
      alerts: [scored('edge', truthOf('true_positive'), 0.5)],
    }).perWording.choice.overall;
    expect(agreementWithTruth).toBe(1);
  });

  it('moves an alert into the benign lane with the wider threshold of 0.15', () => {
    const wide = buildJevReport({ alerts: [scored('w', truthOf('false_positive'), 0.1)] });
    const [narrow, broad] = wide.perWording.choice.overall.lanes;
    expect(narrow.benignLane).toBe(0);
    expect(broad.benignLane).toBe(1);
    expect(lane15.benignThreshold).toBe(0.15);
  });
});

describe('buildJevReport: segments and references', () => {
  it('reports each kind and each key segment on its own', () => {
    const report = buildJevReport({
      alerts: [
        scored('p', truthOf('false_positive', { kind: 'process' }), 0.01),
        scored('c', truthOf('true_positive', { kind: 'cloud' }), 0.99, { keyed: 'none' }),
        scored('s', truthOf('false_positive', { kind: 'file' }), 0.2, { keyed: 'single' }),
      ],
    });

    const { byKind, byKeyed } = report.perWording.choice;
    expect(Object.keys(byKind).sort()).toEqual(['cloud', 'file', 'process']);
    expect(byKeyed.none.alerts).toBe(1);
    expect(byKeyed.single.alerts).toBe(1);
    expect(byKeyed.repeated.alerts).toBe(1);
  });

  it('measures agreement with the truth and with Haiku, and skips an inconclusive Haiku verdict', () => {
    const report = buildJevReport({
      alerts: [
        scored('a', truthOf('true_positive'), 0.9),
        scored('b', truthOf('false_positive'), 0.9),
        scored('c', truthOf('false_positive'), 0.1),
      ],
      haiku: {
        run5: new Map([
          ['a', 'true_positive'],
          ['b', 'false_positive'],
          ['c', 'inconclusive'],
        ]),
      },
    });

    const { agreementWithTruth, agreementWithHaiku } = report.perWording.choice.overall;
    expect(agreementWithTruth).toBe(0.6667);
    expect(agreementWithHaiku.run5).toBe(0.5);
  });

  it('reports the score of planted variants and of harmless hash updates', () => {
    const report = buildJevReport({
      alerts: [
        scored('v1', truthOf('true_positive', { variant: 'new_hash' }), 0.02),
        scored('v2', truthOf('true_positive', { variant: 'new_hash' }), 0.8),
        scored('h1', truthOf('false_positive', { benign: 'hash_update' }), 0.03),
        scored('h2', truthOf('false_positive', { benign: 'hash_update' }), 0.5),
      ],
    });

    const { variants, harmlessHashUpdates } = report.perWording.choice;
    expect(variants.new_hash).toEqual({ alerts: 2, meanScore: 0.41, inBenignLane: 1 });
    expect(harmlessHashUpdates).toEqual({ alerts: 2, meanScore: 0.265, inBenignLane: 1 });
  });

  it('reports the spread between repeats and between wordings, and the latency', () => {
    const report = buildJevReport({
      alerts: [
        scored('s', truthOf('false_positive'), 0, {
          scores: { choice: [0.1, 0.3], benign: [0.5, 0.5], indicator: [0.9, 0.9] },
          latenciesMs: [100, 300],
        }),
      ],
    });

    expect(report.repeatSpread.p95).toBe(0.2);
    expect(report.wordingSpread.p50).toBe(0.7);
    expect(report.latencyMs.p95).toBe(300);
  });

  it('leaves out an alert that has no score in some wording, and says how many calls failed', () => {
    const report = buildJevReport({
      alerts: [
        scored('ok', truthOf('false_positive'), 0.1),
        scored('broken', truthOf('false_positive'), 0.1, {
          scores: { choice: [], benign: [0.1], indicator: [0.1] },
        }),
      ],
      failedCalls: 2,
      failureReasons: { 'choice: the model answered 429': 2 },
    });

    expect(report).toMatchObject({
      alerts: 1,
      failedCalls: 2,
      failureReasons: { 'choice: the model answered 429': 2 },
    });
  });
});

describe('scoreAlerts', () => {
  const cmd = (executable: string): Record<string, unknown> => ({
    'kibana.alert.rule.uuid': 'rule-1',
    'kibana.alert.rule.revision': 1,
    host: { os: { type: 'windows' } },
    process: { executable, code_signature: { subject_name: 'Acme' } },
  });
  const sample = (id: string, doc: Record<string, unknown>): SampleAlert => ({
    id,
    doc,
    truth: truthOf('false_positive'),
  });
  const alerts = [
    sample('a-1', cmd('a.exe')),
    sample('a-2', cmd('a.exe')),
    sample('b-1', cmd('b.exe')),
    sample('n-1', { 'kibana.alert.rule.uuid': 'rule-9' }),
  ];

  it('asks every wording of every alert once per repeat', async () => {
    const decide = jest.fn<ReturnType<Decide>, Parameters<Decide>>(async () => ({
      score: 0.1,
      ms: 5,
    }));

    const { scored: result, failedCalls } = await scoreAlerts({
      alerts,
      decide,
      repeats: 2,
      concurrency: 2,
    });

    expect(decide).toHaveBeenCalledTimes(alerts.length * WORDING_NAMES.length * 2);
    expect(failedCalls).toBe(0);
    expect(result.find(({ id }) => id === 'a-1')?.scores.choice).toEqual([0.1, 0.1]);
  });

  it('marks an alert with no key, the only alert of its key, and an alert of a repeated key', async () => {
    const { scored: result } = await scoreAlerts({
      alerts,
      decide: async () => ({ score: 0.1, ms: 5 }),
      repeats: 1,
      concurrency: 1,
    });

    const keyed = Object.fromEntries(result.map(({ id, keyed: value }) => [id, value]));
    expect(keyed).toEqual({ 'a-1': 'repeated', 'a-2': 'repeated', 'b-1': 'single', 'n-1': 'none' });
  });

  it('tries a failed call three times with a growing pause, then counts it by wording and reason and leaves the score out', async () => {
    const attempts: Record<string, number> = {};
    const decide: Decide = async (_input, wording: WordingName) => {
      attempts[wording] = (attempts[wording] ?? 0) + 1;
      if (wording === 'indicator') throw new Error('the model answered 429');
      return { score: 0.2, ms: 5 };
    };
    const pause = jest.fn(async () => undefined);

    const {
      scored: result,
      failedCalls,
      failureReasons,
    } = await scoreAlerts({ alerts: [alerts[0]], decide, repeats: 1, concurrency: 1, pause });

    expect(attempts.indicator).toBe(3);
    expect(pause.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
    expect(failedCalls).toBe(1);
    expect(failureReasons).toEqual({ 'indicator: the model answered 429': 1 });
    expect(result[0].scores).toMatchObject({ choice: [0.2], benign: [0.2], indicator: [] });
  });

  it('keeps the score of a call that fails once and then works', async () => {
    let calls = 0;
    const decide: Decide = async () => {
      calls++;
      if (calls === 1) throw new Error('the model answered 503');
      return { score: 0.3, ms: 5 };
    };

    const { scored: result, failedCalls } = await scoreAlerts({
      alerts: [alerts[0]],
      decide,
      repeats: 1,
      concurrency: 1,
      pause: async () => undefined,
    });

    expect(failedCalls).toBe(0);
    expect(result[0].scores.choice).toEqual([0.3]);
  });
});

describe('makeDecide', () => {
  const answer = (body: unknown, ok = true) =>
    jest.fn(async () => ({ ok, status: ok ? 200 : 503, json: async () => body }));
  const withFetch = async (mock: jest.Mock, run: () => Promise<void>) => {
    const original = global.fetch;
    global.fetch = mock as unknown as typeof fetch;
    try {
      await run();
    } finally {
      global.fetch = original;
    }
  };
  const decide = makeDecide({ url: 'https://qa.example', apiKey: 'k', endpoint: '.jev' });

  it('reads the probability of true_positive for the choice wording, in both shapes of the answer', async () => {
    const asList = answer({
      decision: {
        answers: { choice: { probabilities: [{ value: 'true_positive', probability: 0.7 }] } },
      },
    });
    const asObject = answer({
      decision: { answers: { choice: { probabilities: { true_positive: 0.4 } } } },
    });

    await withFetch(asList, async () => expect((await decide('x', 'choice')).score).toBe(0.7));
    await withFetch(asObject, async () => expect((await decide('x', 'choice')).score).toBe(0.4));
  });

  it('turns the answer "benign" into a score for an attack, so that all wordings point the same way', async () => {
    const mock = answer({ decision: { answers: { benign: { probability: 0.9 } } } });

    await withFetch(mock, async () => {
      expect((await decide('x', 'benign')).score).toBeCloseTo(0.1);
    });
  });

  it('sends the input and the question to the endpoint with the key in the header', async () => {
    const mock = answer({ decision: { answers: { indicator: { probability: 0.2 } } } });

    await withFetch(mock, async () => {
      await decide('the alert', 'indicator');
      const [url, init] = mock.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string }
      ];
      expect(url).toBe('https://qa.example/_inference/decision/.jev');
      expect(init.headers.Authorization).toBe('ApiKey k');
      expect(JSON.parse(init.body)).toMatchObject({
        input: 'the alert',
        task_settings: { questions: { indicator: { type: 'predicate' } } },
      });
    });
  });

  it('throws, without the key in the message, when the model answers with an error or with no probability', async () => {
    await withFetch(answer({}, false), async () => {
      await expect(decide('x', 'choice')).rejects.toThrow('503');
      await expect(decide('x', 'choice')).rejects.not.toThrow(/ApiKey/);
    });
    await withFetch(answer({ decision: { answers: {} } }), async () => {
      await expect(decide('x', 'choice')).rejects.toThrow('no probability');
    });
  });
});

describe('readSample', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-sample-'));
  afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));

  it('joins each alert with its truth, and refuses an alert that has none', async () => {
    fs.writeFileSync(
      path.join(folder, 'alerts.ndjson'),
      `${JSON.stringify({ _id: 'a', _source: { 'host.name': 'h' } })}\n`
    );
    fs.writeFileSync(
      path.join(folder, 'truth.ndjson'),
      `${JSON.stringify({
        id: 'a',
        verdict: 'true_positive',
        variant: 'new_hash',
        benign: null,
        kind: 'file',
      })}\n`
    );

    const [alert] = await readSample(folder);

    expect(alert.truth).toEqual({
      verdict: 'true_positive',
      variant: 'new_hash',
      benign: null,
      kind: 'file',
    });

    fs.writeFileSync(path.join(folder, 'truth.ndjson'), '');
    await expect(readSample(folder)).rejects.toThrow('has no truth record');
  });
});
