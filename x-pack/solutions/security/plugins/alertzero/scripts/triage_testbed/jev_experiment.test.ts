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
  ANALYSIS_BATCH_SIZE,
  WORDING_NAMES,
  alertInput,
  areaUnderCurve,
  batchInput,
  batchQuestions,
  buildJevReport,
  isSafeRemoteUrl,
  makeDecide,
  makeDecideBatch,
  planBatches,
  readSample,
  scoreAlerts,
  scoreAlertsInBatches,
  type AlertTruthRecord,
  type Decide,
  type DecideBatch,
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
        }),
      ],
      callLatenciesMs: [100, 300],
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
    const pause = jest.fn(async (_ms: number) => undefined);

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
  const decide = makeDecide({
    url: 'https://qa.example',
    apiKey: 'secret-key-123',
    endpoint: '.jev',
  });

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
      expect(init.headers.Authorization).toBe('ApiKey secret-key-123');
      expect(JSON.parse(init.body)).toMatchObject({
        input: 'the alert',
        task_settings: { questions: { indicator: { type: 'predicate' } } },
      });
    });
  });

  it('throws, without the key in the message, when the model answers with an error or with no probability', async () => {
    await withFetch(answer({}, false), async () => {
      await expect(decide('x', 'choice')).rejects.toThrow('503');
      await expect(decide('x', 'choice')).rejects.not.toThrow(/secret-key-123/);
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

describe('batches, as Alert Analysis sends them', () => {
  const doc = (rule: string, minute: number, extra: Record<string, unknown> = {}) => ({
    '@timestamp': `2026-11-15T10:${String(minute).padStart(2, '0')}:00.000Z`,
    'kibana.alert.rule.uuid': rule,
    'kibana.alert.rule.name': `Rule ${rule}`,
    process: { executable: `C:\\${rule}.exe`, command_line: `${rule}.exe -x ${minute}` },
    ...extra,
  });
  const sample = (id: string, rule: string, minute: number): SampleAlert => ({
    id,
    doc: doc(rule, minute),
    truth: truthOf('false_positive'),
  });

  it('uses the batch size of the analysis workflow', () => {
    expect(ANALYSIS_BATCH_SIZE).toBe(50);
  });

  describe('planBatches', () => {
    it('makes one batch for each rule, in the order in which the rules first appear, with the alerts oldest first and then by id', () => {
      const batches = planBatches([
        sample('b-2', 'B', 5),
        sample('a-1', 'A', 9),
        sample('b-1', 'B', 5),
        sample('a-2', 'A', 1),
      ]);

      expect(batches.map((batch) => batch.map(({ id }) => id))).toEqual([
        ['b-1', 'b-2'],
        ['a-2', 'a-1'],
      ]);
    });

    it('splits a rule into consecutive batches of at most the batch size, and keeps the order', () => {
      const alerts = Array.from({ length: 5 }, (_unused, i) => sample(`a-${i}`, 'A', i));

      const batches = planBatches(alerts, 2);

      expect(batches.map((batch) => batch.map(({ id }) => id))).toEqual([
        ['a-0', 'a-1'],
        ['a-2', 'a-3'],
        ['a-4'],
      ]);
    });

    it('never mixes two rules in one batch', () => {
      const batches = planBatches([sample('a', 'A', 1), sample('b', 'B', 1)], 50);

      expect(batches).toHaveLength(2);
    });

    it('with a sweep window, batches only the alerts of a rule that arrived in the same window, as one worker sweep sees them', () => {
      const batches = planBatches(
        [
          sample('a-1', 'A', 1),
          sample('a-2', 'A', 14),
          sample('a-3', 'A', 16),
          sample('b-1', 'B', 2),
        ],
        50,
        15 * 60_000
      );

      expect(batches.map((batch) => batch.map(({ id }) => id))).toEqual([
        ['a-1', 'a-2'],
        ['a-3'],
        ['b-1'],
      ]);
    });

    it('with a sweep window, refuses an alert without a timestamp instead of placing it in a made-up sweep', () => {
      const noTime: SampleAlert = {
        ...sample('x', 'A', 1),
        doc: { 'kibana.alert.rule.uuid': 'A' },
      };

      expect(() => planBatches([noTime], 50, 15 * 60_000)).toThrow('has no @timestamp');
    });
  });

  describe('batchInput and batchQuestions', () => {
    it('numbers the alerts under the name of the rule, without repeating the "Alert:" header of a single alert', () => {
      const input = batchInput([doc('A', 1), doc('A', 2)]);

      expect(input.startsWith('Rule: Rule A\n\nAlert 1:\n')).toBe(true);
      expect(input).toContain('\n\nAlert 2:\n');
      expect(input).not.toContain('Alert:\n');
      expect(input).toContain('A.exe -x 1');
      expect(input).toContain('A.exe -x 2');
    });

    it('asks one question for each alert, names the alert in it and keeps the wording of the question', () => {
      const questions = batchQuestions('choice', 3);

      expect(Object.keys(questions)).toEqual(['alert_1', 'alert_2', 'alert_3']);
      expect(questions.alert_2.instructions.startsWith('Judge Alert 2 only')).toBe(true);
      expect(questions.alert_2).toMatchObject({ type: 'choice' });
      expect(batchQuestions('indicator', 1).alert_1).toMatchObject({ type: 'predicate' });
    });
  });

  describe('scoreAlertsInBatches', () => {
    const alerts = [
      sample('a-1', 'A', 1),
      sample('a-2', 'A', 2),
      sample('a-3', 'A', 3),
      sample('b-1', 'B', 1),
    ];
    const noPause = async (_ms: number) => undefined;

    it('makes one call for each batch, wording and repeat, and gives each alert the score of its position', async () => {
      const decideBatch = jest.fn<ReturnType<DecideBatch>, Parameters<DecideBatch>>(
        async (_input, _wording, count) => ({
          scores: Array.from({ length: count }, (_unused, index) => (index + 1) / 10),
          ms: 7,
        })
      );

      const result = await scoreAlertsInBatches({
        alerts,
        decideBatch,
        repeats: 2,
        concurrency: 2,
        pause: noPause,
      });

      expect(decideBatch).toHaveBeenCalledTimes(2 * WORDING_NAMES.length * 2);
      expect(result).toMatchObject({ calls: 12, failedCalls: 0 });
      expect(result.callLatenciesMs).toHaveLength(12);
      const byId = Object.fromEntries(result.scored.map(({ id, scores }) => [id, scores.choice]));
      expect(byId).toEqual({
        'a-1': [0.1, 0.1],
        'a-2': [0.2, 0.2],
        'a-3': [0.3, 0.3],
        'b-1': [0.1, 0.1],
      });
    });

    it('sends the alerts of a batch in one text, in the order of the batch', async () => {
      const inputs: string[] = [];
      const decideBatch: DecideBatch = async (input, _wording, count) => {
        inputs.push(input);
        return { scores: Array(count).fill(0.5), ms: 1 };
      };

      await scoreAlertsInBatches({
        alerts: [sample('late', 'A', 9), sample('early', 'A', 1)],
        decideBatch,
        repeats: 1,
        concurrency: 1,
        pause: noPause,
      });

      expect(inputs[0].indexOf('A.exe -x 1')).toBeLessThan(inputs[0].indexOf('A.exe -x 9'));
    });

    it('marks the keys like the single mode does', async () => {
      const result = await scoreAlertsInBatches({
        alerts,
        decideBatch: async (_input, _wording, count) => ({ scores: Array(count).fill(0.5), ms: 1 }),
        repeats: 1,
        concurrency: 1,
        pause: noPause,
      });

      const single = await scoreAlerts({
        alerts,
        decide: async () => ({ score: 0.5, ms: 1 }),
        repeats: 1,
        concurrency: 1,
      });
      const keyedById = (list: ReadonlyArray<{ id: string; keyed: string }>) =>
        Object.fromEntries(list.map(({ id, keyed }) => [id, keyed]));
      expect(result.scored).toHaveLength(alerts.length);
      expect(keyedById(result.scored)).toEqual(keyedById(single.scored));
    });

    it('leaves every alert of a batch without a score when its call fails three times, and counts one failed call', async () => {
      const decideBatch: DecideBatch = async (_input, wording, count) => {
        if (wording === 'indicator') throw new Error('the model answered 429');
        return { scores: Array(count).fill(0.2), ms: 1 };
      };

      const result = await scoreAlertsInBatches({
        alerts: [sample('a-1', 'A', 1), sample('a-2', 'A', 2)],
        decideBatch,
        repeats: 1,
        concurrency: 1,
        pause: noPause,
      });

      expect(result.failedCalls).toBe(1);
      expect(result.failureReasons).toEqual({ 'indicator: the model answered 429': 1 });
      expect(result.scored.map(({ scores }) => scores.indicator)).toEqual([[], []]);
      expect(result.scored.map(({ scores }) => scores.choice)).toEqual([[0.2], [0.2]]);
    });

    it('counts an alert that the model did not answer, and leaves only that alert without a score', async () => {
      const decideBatch: DecideBatch = async (_input, _wording, count) => ({
        scores: Array.from({ length: count }, (_unused, index) => (index === 1 ? undefined : 0.4)),
        ms: 1,
      });

      const result = await scoreAlertsInBatches({
        alerts: [sample('a-1', 'A', 1), sample('a-2', 'A', 2), sample('a-3', 'A', 3)],
        decideBatch,
        repeats: 1,
        concurrency: 1,
        pause: noPause,
      });

      expect(result.failureReasons['choice: no answer for an alert in the batch']).toBe(1);
      const byId = Object.fromEntries(result.scored.map(({ id, scores }) => [id, scores.choice]));
      expect(byId).toEqual({ 'a-1': [0.4], 'a-2': [], 'a-3': [0.4] });
    });
  });

  describe('makeDecideBatch', () => {
    const withFetch = async (response: unknown, run: (mock: jest.Mock) => Promise<void>) => {
      const mock = jest.fn(async () => ({ ok: true, status: 200, json: async () => response }));
      const original = global.fetch;
      global.fetch = mock as unknown as typeof fetch;
      try {
        await run(mock);
      } finally {
        global.fetch = original;
      }
    };
    const decideBatch = makeDecideBatch({
      url: 'https://qa.example',
      apiKey: 'k',
      endpoint: '.jev',
    });

    it('sends all alerts and one question for each in one request, and reads each answer by its name', async () => {
      const answers = {
        alert_1: { probabilities: [{ value: 'true_positive', probability: 0.9 }] },
        alert_3: { probabilities: [{ value: 'true_positive', probability: 0.1 }] },
      };

      await withFetch({ decision: { answers } }, async (mock) => {
        const { scores } = await decideBatch('the batch', 'choice', 3);

        expect(scores).toEqual([0.9, undefined, 0.1]);
        expect(mock).toHaveBeenCalledTimes(1);
        const [, init] = mock.mock.calls[0] as unknown as [string, { body: string }];
        const body = JSON.parse(init.body);
        expect(body.input).toBe('the batch');
        expect(Object.keys(body.task_settings.questions)).toEqual([
          'alert_1',
          'alert_2',
          'alert_3',
        ]);
      });
    });

    it('turns a "benign" answer into an attack score, like the single mode', async () => {
      await withFetch({ decision: { answers: { alert_1: { probability: 0.8 } } } }, async () => {
        const { scores } = await decideBatch('x', 'benign', 1);

        expect(scores[0]).toBeCloseTo(0.2);
      });
    });
  });

  it('reports the mode, the calls, the time of a call and the score of each alert', () => {
    const report = buildJevReport({
      alerts: [scored('a', truthOf('false_positive'), 0.2)],
      mode: 'batch',
      calls: 6,
      callLatenciesMs: [100, 400],
    });

    expect(report).toMatchObject({ mode: 'batch', calls: 6, latencyMs: { p95: 400 } });
    expect(report.alertScores.a).toEqual({ choice: 0.2, benign: 0.2, indicator: 0.2 });
  });
});

describe('the label and the confidence that the model gives itself', () => {
  const choiceAnswer = (choice: string, confidence: number, pTp: number) => ({
    type: 'choice',
    choice,
    confidence,
    probabilities: [
      { value: 'true_positive', probability: pTp },
      { value: 'false_positive', probability: 1 - pTp },
    ],
  });
  const withFetch = async (response: unknown, run: () => Promise<void>) => {
    const mock = jest.fn(async () => ({ ok: true, status: 200, json: async () => response }));
    const original = global.fetch;
    global.fetch = mock as unknown as typeof fetch;
    try {
      await run();
    } finally {
      global.fetch = original;
    }
  };
  const connection = { url: 'https://qa.example', apiKey: 'k', endpoint: '.jev' };

  it('returns the label and the confidence of a choice answer next to the score', async () => {
    await withFetch(
      { decision: { answers: { choice: choiceAnswer('true_positive', 0.88, 0.94) } } },
      async () => {
        const decision = await makeDecide(connection)('x', 'choice');

        expect(decision.score).toBe(0.94);
        expect(decision.detail).toEqual({ choice: 'true_positive', confidence: 0.88 });
      }
    );
  });

  it('returns no detail for a yes or no question, which has no label or confidence of its own', async () => {
    await withFetch({ decision: { answers: { benign: { probability: 0.4 } } } }, async () => {
      expect((await makeDecide(connection)('x', 'benign')).detail).toBeUndefined();
    });
  });

  it('returns the labels and confidences of a batch by position, and nothing for an alert that was not answered', async () => {
    await withFetch(
      {
        decision: {
          answers: {
            alert_1: choiceAnswer('false_positive', 0.9, 0.05),
            alert_3: choiceAnswer('true_positive', 0.5, 0.75),
          },
        },
      },
      async () => {
        const { details } = await makeDecideBatch(connection)('x', 'choice', 3);

        expect(details).toEqual([
          { choice: 'false_positive', confidence: 0.9 },
          undefined,
          { choice: 'true_positive', confidence: 0.5 },
        ]);
      }
    );
  });

  it('collects the details of the choice wording for each repeat, and of no other wording', async () => {
    const decide: Decide = async (_input, wording) => ({
      score: 0.2,
      ms: 1,
      detail: { choice: 'false_positive', confidence: wording === 'choice' ? 0.7 : 0.1 },
    });

    const { scored: result } = await scoreAlerts({
      alerts: [
        {
          id: 'a',
          doc: { 'process.executable': 'C:\\a.exe' },
          truth: truthOf('false_positive'),
        },
      ],
      decide,
      repeats: 2,
      concurrency: 1,
      pause: async () => undefined,
    });

    expect(result[0].choiceDetails).toEqual([
      { choice: 'false_positive', confidence: 0.7 },
      { choice: 'false_positive', confidence: 0.7 },
    ]);
  });

  it('gives each alert of a batch the details of its own position', async () => {
    const decideBatch: DecideBatch = async (_input, wording, count) => ({
      scores: Array(count).fill(0.3),
      ms: 1,
      details: Array.from({ length: count }, (_unused, index) =>
        wording === 'choice'
          ? { choice: 'true_positive', confidence: (index + 1) / 10 }
          : { choice: 'false_positive', confidence: 0.99 }
      ),
    });
    const alert = (id: string, minute: number): SampleAlert => ({
      id,
      doc: {
        '@timestamp': `2026-11-15T10:0${minute}:00.000Z`,
        'kibana.alert.rule.uuid': 'A',
        'process.executable': 'C:\\a.exe',
      },
      truth: truthOf('false_positive'),
    });

    const { scored: result } = await scoreAlertsInBatches({
      alerts: [alert('first', 1), alert('second', 2)],
      decideBatch,
      repeats: 1,
      concurrency: 1,
      pause: async () => undefined,
    });

    const byId = Object.fromEntries(result.map(({ id, choiceDetails }) => [id, choiceDetails]));
    expect(byId).toEqual({
      first: [{ choice: 'true_positive', confidence: 0.1 }],
      second: [{ choice: 'true_positive', confidence: 0.2 }],
    });
  });

  it('reports, per alert, the label picked most often, the mean confidence and the attack probability', () => {
    const report = buildJevReport({
      alerts: [
        scored('a', truthOf('true_positive'), 0.8, {
          choiceDetails: [
            { choice: 'true_positive', confidence: 0.6 },
            { choice: 'false_positive', confidence: 0.2 },
            { choice: 'true_positive', confidence: 0.7 },
          ],
        }),
        scored('b', truthOf('false_positive'), 0.1),
      ],
    });

    expect(report.alertAnswers.a).toEqual({
      choice: 'true_positive',
      confidence: 0.5,
      attackProbability: 0.8,
    });
    expect(report.alertAnswers.b).toEqual({
      choice: null,
      confidence: null,
      attackProbability: 0.1,
    });
  });

  it('takes the first label when two labels occur equally often', () => {
    const report = buildJevReport({
      alerts: [
        scored('t', truthOf('true_positive'), 0.5, {
          choiceDetails: [
            { choice: 'false_positive', confidence: 0.5 },
            { choice: 'true_positive', confidence: 0.5 },
          ],
        }),
      ],
    });

    expect(report.alertAnswers.t.choice).toBe('false_positive');
  });
});

describe('extra fields in the input', () => {
  const doc = {
    'kibana.alert.rule.name': 'Rule One',
    'kibana.alert.reason': '258 events in 5 minutes against a usual 6',
    'kibana.alert.workflow_tags': ['az:true_positive'],
    'host.name': 'host-1',
  };

  it('shows the extra fields after the fields that Alert Analysis shows, and nothing extra by default', () => {
    const withReason = alertInput(doc, ['kibana.alert.reason']);

    expect(withReason).toContain(
      '- kibana.alert.reason: 258 events in 5 minutes against a usual 6'
    );
    expect(withReason.indexOf('host.name')).toBeLessThan(withReason.indexOf('kibana.alert.reason'));
    expect(alertInput(doc)).not.toContain('kibana.alert.reason');
  });

  it('never shows the workflow tags, even when they are asked for, because they can hold a verdict', () => {
    expect(alertInput(doc, ['kibana.alert.workflow_tags'])).not.toContain('az:true_positive');
  });

  it('shows a field once, when it is asked for and Alert Analysis shows it already', () => {
    const input = alertInput(doc, ['host.name', 'host.name']);

    expect(input.match(/- host\.name:/g)).toHaveLength(1);
  });

  it('leaves out an extra field that the alert does not have', () => {
    expect(alertInput(doc, ['kibana.alert.threshold_result.count'])).not.toContain(
      'threshold_result'
    );
  });

  it('puts the extra fields in every alert of a batch', () => {
    const input = batchInput(
      [doc, { ...doc, 'kibana.alert.reason': 'another reason' }],
      ['kibana.alert.reason']
    );

    expect(input).toContain('Alert 1:');
    expect(input).toContain('258 events in 5 minutes against a usual 6');
    expect(input).toContain('another reason');
    expect(batchInput([doc])).not.toContain('258 events');
  });

  it('sends the extra fields to the model in both modes, and records them in the report', async () => {
    const seen: string[] = [];
    const decide: Decide = async (input) => {
      seen.push(input);
      return { score: 0.2, ms: 1 };
    };
    const sampleAlert: SampleAlert = {
      id: 'a',
      doc: { ...doc, 'process.executable': 'C:\\a.exe' },
      truth: truthOf('false_positive'),
    };

    await scoreAlerts({
      alerts: [sampleAlert],
      decide,
      repeats: 1,
      concurrency: 1,
      extraFields: ['kibana.alert.reason'],
      pause: async () => undefined,
    });
    const batchSeen: string[] = [];
    await scoreAlertsInBatches({
      alerts: [sampleAlert],
      decideBatch: async (input, _wording, count) => {
        batchSeen.push(input);
        return { scores: Array(count).fill(0.2), ms: 1 };
      },
      repeats: 1,
      concurrency: 1,
      extraFields: ['kibana.alert.reason'],
      pause: async () => undefined,
    });

    expect(seen).not.toHaveLength(0);
    expect(batchSeen).not.toHaveLength(0);
    expect(seen.every((input) => input.includes('258 events'))).toBe(true);
    expect(batchSeen.every((input) => input.includes('258 events'))).toBe(true);
    expect(
      buildJevReport({ alerts: [], extraFields: ['kibana.alert.reason'] }).extraFields
    ).toEqual(['kibana.alert.reason']);
    expect(buildJevReport({ alerts: [] }).extraFields).toEqual([]);
  });
});

describe('isSafeRemoteUrl', () => {
  // The API key goes in a header: it must never cross a network in plain text.
  it('allows https anywhere and http only to this machine', () => {
    expect(isSafeRemoteUrl('https://project.es.qa.example.co')).toBe(true);
    expect(isSafeRemoteUrl('http://localhost:9200')).toBe(true);
    expect(isSafeRemoteUrl('http://127.0.0.1:9200')).toBe(true);
    expect(isSafeRemoteUrl('http://project.es.qa.example.co')).toBe(false);
    expect(isSafeRemoteUrl('http://localhost.example.co:9200')).toBe(false);
    expect(isSafeRemoteUrl('not a url')).toBe(false);
  });
});
