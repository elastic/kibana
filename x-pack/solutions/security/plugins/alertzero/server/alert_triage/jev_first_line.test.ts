/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  JEV_BATCH_SIZE,
  isJevEligible,
  jevBatchInput,
  jevBatchQuestions,
  laneOf,
  planJevBatches,
  readJevScores,
  toJevFirstLineMode,
} from './jev_first_line';

const registryDoc = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  '@timestamp': '2026-11-15T10:00:00.000Z',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Registry Rule',
  'kibana.alert.rule.revision': 1,
  'event.category': ['registry'],
  'registry.path': 'HKLM\\Software\\Acme',
  'process.executable': 'C:\\Tools\\reg.exe',
  'host.os.type': 'windows',
  ...extra,
});

describe('toJevFirstLineMode', () => {
  it('reads shadow and on, and every other value as off, so that a mistyped value cannot close an alert', () => {
    expect(toJevFirstLineMode('shadow')).toBe('shadow');
    expect(toJevFirstLineMode('on')).toBe('on');
    expect(['off', '', 'ON', 'true', 'on '].map(toJevFirstLineMode)).toEqual(Array(5).fill('off'));
  });
});

describe('jevBatchQuestions', () => {
  it('asks one choice question for each alert, names the alert and keeps the same wording in every question', () => {
    const questions = jevBatchQuestions(3);

    expect(Object.keys(questions)).toEqual(['alert_1', 'alert_2', 'alert_3']);
    expect(questions.alert_2).toMatchObject({ type: 'choice' });
    expect(String(questions.alert_2.instructions).startsWith('Judge Alert 2 only')).toBe(true);
    expect(String(questions.alert_1.instructions).replace('Alert 1', 'Alert 2')).toBe(
      String(questions.alert_2.instructions)
    );
    expect(questions.alert_1.choices).toEqual({
      true_positive: expect.any(String),
      false_positive: expect.any(String),
    });
  });
});

describe('jevBatchInput', () => {
  it('shows the rule name and the numbered alerts with the fields that Alert Analysis shows', () => {
    const input = jevBatchInput([
      registryDoc(),
      registryDoc({ 'process.executable': 'C:\\b.exe' }),
    ]);

    expect(input.startsWith('Rule: Registry Rule\n\nAlert 1:\n')).toBe(true);
    expect(input).toContain('\n\nAlert 2:\n');
    expect(input).toContain('- process.executable: C:\\Tools\\reg.exe');
    expect(input).toContain('- process.executable: C:\\b.exe');
  });

  it('never shows the workflow tags, because they can hold a verdict, and leaves out fields that the alert does not have', () => {
    const input = jevBatchInput([
      registryDoc({
        'kibana.alert.workflow_tags': ['az:true_positive'],
        'unlisted.field': 'secret',
      }),
    ]);

    expect(input).not.toContain('az:true_positive');
    expect(input).not.toContain('unlisted');
  });

  it('cuts a long value', () => {
    expect(
      jevBatchInput([registryDoc({ 'process.command_line': 'x'.repeat(5000) })]).length
    ).toBeLessThan(2600);
  });
});

describe('readJevScores', () => {
  const answer = (attack: number, confidence: number) => ({
    type: 'choice',
    probabilities: [
      { value: 'true_positive', probability: attack },
      { value: 'false_positive', probability: 1 - attack },
    ],
    confidence,
  });

  it('reads the attack probability and the confidence of each alert by its position', () => {
    const scores = readJevScores({ alert_1: answer(0.02, 0.96), alert_2: answer(0.9, 0.8) }, 2);

    expect(scores).toEqual([
      { attackProbability: 0.02, confidence: 0.96 },
      { attackProbability: 0.9, confidence: 0.8 },
    ]);
  });

  it('reads the probabilities as a map too, because the shape differs between versions of the model', () => {
    expect(
      readJevScores({ alert_1: { probabilities: { true_positive: 0.3 }, confidence: 0.4 } }, 1)
    ).toEqual([{ attackProbability: 0.3, confidence: 0.4 }]);
  });

  it('gives no score to an alert that was not answered or whose answer is incomplete', () => {
    const scores = readJevScores(
      {
        alert_1: answer(0.01, 0.98),
        alert_3: { probabilities: [{ value: 'true_positive', probability: 0.5 }] },
        alert_4: { confidence: 0.9 },
        alert_5: 'nonsense',
      },
      5
    );

    expect(scores).toEqual([
      { attackProbability: 0.01, confidence: 0.98 },
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe('laneOf', () => {
  it('puts an alert in the benign lane at an attack probability of at most 0.05 and a confidence of at least 0.9, edges included', () => {
    expect(laneOf({ attackProbability: 0.05, confidence: 0.9 })).toBe('benign');
    expect(laneOf({ attackProbability: 0, confidence: 1 })).toBe('benign');
  });

  it('does not put an alert in the benign lane when either bound is missed', () => {
    expect(laneOf({ attackProbability: 0.06, confidence: 0.9 })).toBe('middle');
    expect(laneOf({ attackProbability: 0.05, confidence: 0.89 })).toBe('middle');
  });

  it('puts an alert in the attack lane at an attack probability of at least 0.98, and the rest in the middle', () => {
    expect(laneOf({ attackProbability: 0.98, confidence: 0.96 })).toBe('attack');
    expect(laneOf({ attackProbability: 0.97, confidence: 0.94 })).toBe('middle');
    expect(laneOf({ attackProbability: 0.5, confidence: 0 })).toBe('middle');
  });
});

describe('isJevEligible', () => {
  it('scores the alerts of a registry, file or cloud key only', () => {
    expect(isJevEligible(registryDoc())).toBe(true);
    expect(
      isJevEligible({
        'kibana.alert.rule.uuid': 'r',
        'kibana.alert.rule.revision': 1,
        'event.category': ['file'],
        'file.path': 'C:\\a.dat',
        'process.executable': 'C:\\a.exe',
      })
    ).toBe(true);
    expect(
      isJevEligible({
        'kibana.alert.rule.uuid': 'r',
        'kibana.alert.rule.revision': 1,
        'event.action': 'ListBuckets',
        'cloud.account.id': '1234',
      })
    ).toBe(true);
  });

  it('leaves out a process alert, a library alert and an alert without a key, which always go to analysis', () => {
    expect(
      isJevEligible({
        'kibana.alert.rule.uuid': 'r',
        'kibana.alert.rule.revision': 1,
        'process.executable': 'C:\\a.exe',
        'process.code_signature.subject_name': 'Acme',
      })
    ).toBe(false);
    expect(
      isJevEligible({
        'kibana.alert.rule.uuid': 'r',
        'kibana.alert.rule.revision': 1,
        'event.category': ['library'],
        'dll.path': 'C:\\a.dll',
      })
    ).toBe(false);
    expect(isJevEligible({ 'kibana.alert.rule.uuid': 'r' })).toBe(false);
  });
});

describe('planJevBatches', () => {
  const alert = (id: string, rule: string, minute: number) => ({
    id,
    doc: registryDoc({
      'kibana.alert.rule.uuid': rule,
      '@timestamp': `2026-11-15T10:${String(minute).padStart(2, '0')}:00.000Z`,
    }),
  });

  it('makes one batch for each rule with the oldest alert first, and never mixes two rules', () => {
    const batches = planJevBatches([
      alert('b-1', 'B', 9),
      alert('a-1', 'A', 9),
      alert('a-2', 'A', 1),
    ]);

    expect(batches.map((batch) => batch.map(({ id }) => id))).toEqual([['b-1'], ['a-2', 'a-1']]);
  });

  it('splits a rule into consecutive batches of at most the batch size', () => {
    const alerts = Array.from({ length: JEV_BATCH_SIZE + 3 }, (_unused, i) =>
      alert(`a-${String(i).padStart(3, '0')}`, 'A', 1)
    );

    const batches = planJevBatches(alerts);

    expect(batches.map((batch) => batch.length)).toEqual([JEV_BATCH_SIZE, 3]);
    expect(JEV_BATCH_SIZE).toBe(50);
    expect(planJevBatches(alerts, 20).map((batch) => batch.length)).toEqual([20, 20, 13]);
  });

  it('has no batch for no alert', () => {
    expect(planJevBatches([])).toEqual([]);
  });
});
