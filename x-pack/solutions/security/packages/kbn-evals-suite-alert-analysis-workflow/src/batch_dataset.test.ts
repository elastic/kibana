/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBatchDocs, planBatch } from './batch_dataset';
import { BATCH_RULES } from './batch_rules';
import { batchEvaluators } from './batch_evaluators';

const count = (labels: string[], label: string) => labels.filter((l) => l === label).length;

const RULE = BATCH_RULES.powershell;
const SHAPE_WEIGHT = Object.fromEntries(RULE.shapes.map(({ id, weight }) => [id, weight]));

describe('planBatch', () => {
  it('fixes the exact number of true and false positives, so quality can be judged', () => {
    const labels = planBatch({ rule: RULE, size: 50 }).map(({ expected }) => expected);

    expect(labels).toHaveLength(50);
    expect(count(labels, 'true_positive')).toBe(10);
    expect(count(labels, 'false_positive')).toBe(40);
  });

  it('is a pure function of its inputs, and a different seed reorders it', () => {
    expect(planBatch({ rule: RULE, size: 50, seed: 7 })).toEqual(
      planBatch({ rule: RULE, size: 50, seed: 7 })
    );
    expect(planBatch({ rule: RULE, size: 50, seed: 7 })).not.toEqual(
      planBatch({ rule: RULE, size: 50, seed: 8 })
    );
  });

  it('interleaves the classes, so position says nothing about the label', () => {
    const firstQuarter = planBatch({ rule: RULE, size: 100 })
      .slice(0, 25)
      .map(({ expected }) => expected);

    expect(count(firstQuarter, 'true_positive')).toBeGreaterThan(0);
    expect(count(firstQuarter, 'false_positive')).toBeGreaterThan(0);
  });

  it('skews benign alerts towards the high-volume sources, as a real estate does', () => {
    const benign = planBatch({ rule: RULE, size: 100 }).filter(
      ({ expected }) => expected === 'false_positive'
    );
    const perShape = (id: string) => benign.filter(({ shape }) => shape === id).length;

    expect(perShape('ps-sccm-script')).toBeGreaterThan(perShape('ps-veeam-backup-job'));
    expect(perShape('ps-veeam-backup-job')).toBeGreaterThan(perShape('ps-tenable-agent-scan'));
    // 80 benign alerts over weights 5/3/2/1/1 (12 in total).
    expect(perShape('ps-sccm-script')).toBe(Math.round((80 * SHAPE_WEIGHT['ps-sccm-script']) / 12));
  });

  it('keeps hard shapes out of standard batches, so earlier results stay comparable', () => {
    const hardIds = new Set(RULE.shapes.filter(({ hard }) => hard).map(({ id }) => id));
    const plan = planBatch({ rule: RULE, size: 100 });

    expect(plan.some(({ shape }) => hardIds.has(shape))).toBe(false);
    expect(plan.some(({ hard }) => hard)).toBe(false);
  });

  it('adds the hard shapes to hard batches without changing the class counts', () => {
    const plan = planBatch({ rule: RULE, size: 50, hard: true });
    const labels = plan.map(({ expected }) => expected);

    expect(count(labels, 'true_positive')).toBe(10);
    expect(count(labels, 'false_positive')).toBe(40);
    // Every hard shape is drawn at least once, in both classes.
    const drawn = new Set(plan.filter(({ hard }) => hard).map(({ shape }) => shape));
    expect(drawn).toEqual(new Set(RULE.shapes.filter(({ hard }) => hard).map(({ id }) => id)));
    const hardLabels = plan.filter(({ hard }) => hard).map(({ expected }) => expected);
    expect(count(hardLabels, 'true_positive')).toBeGreaterThan(0);
    expect(count(hardLabels, 'false_positive')).toBeGreaterThan(0);
  });

  it.each(Object.values(BATCH_RULES))(
    'has labeled shapes of both classes for $id',
    ({ shapes }) => {
      expect(shapes.some(({ expected }) => expected === 'true_positive')).toBe(true);
      expect(shapes.some(({ expected }) => expected === 'false_positive')).toBe(true);
    }
  );
});

describe('buildBatchDocs', () => {
  const plan = planBatch({ rule: RULE, size: 60 });
  const docs = buildBatchDocs({ ruleKey: 'powershell', plan, runId: 'run', ruleId: 'rule-1' });

  it('puts every alert under one rule, with one rule name and its own ids', () => {
    expect(new Set(docs.map(({ doc }) => doc['kibana.alert.rule.uuid']))).toEqual(
      new Set(['rule-1'])
    );
    expect(new Set(docs.map(({ doc }) => doc['kibana.alert.rule.name']))).toEqual(
      new Set([RULE.ruleName])
    );
    expect(new Set(docs.map(({ id }) => id)).size).toBe(60);
    expect(new Set(docs.map(({ doc }) => doc['process.entity_id'])).size).toBe(60);
  });

  it('keeps the evidence behind a label fixed per shape: signer and parent never vary', () => {
    const bySignal = new Map<string, Set<string>>();
    plan.forEach(({ shape }, i) => {
      const { doc } = docs[i];
      const signal = [
        doc['process.parent.name'],
        doc['process.parent.code_signature.subject_name'],
        doc['process.code_signature.trusted'],
      ].join('|');
      bySignal.set(shape, (bySignal.get(shape) ?? new Set()).add(signal));
    });
    for (const signals of bySignal.values()) {
      expect(signals.size).toBe(1);
    }
  });

  it('generates a different script name per alert, as real tools do', () => {
    const sccm = plan.flatMap(({ shape }, i) =>
      shape === 'ps-sccm-script' ? [docs[i].doc['process.command_line']] : []
    );
    expect(new Set(sccm).size).toBe(sccm.length);
  });
});

describe('batch evaluators', () => {
  const expected = {
    labels: ['true_positive', 'true_positive', 'false_positive', 'false_positive'],
    shapes: ['a', 'a', 'b', 'b'],
    hard: [false, true, false, true],
  };
  const score = async (name: string, classifications: Array<string | undefined>) => {
    const evaluator = batchEvaluators.find((e) => e.name === name);
    const result = await evaluator?.evaluate({
      input: {},
      expected,
      output: {
        predictions: classifications.map((classification) => ({ classification })),
        executionStatus: 'completed',
      },
      metadata: {},
    } as never);
    return result?.score;
  };

  it('counts a dropped verdict as wrong and lowers coverage', async () => {
    const dropped = ['true_positive', undefined, 'false_positive', 'false_positive'];
    expect(await score('BatchCoverage', dropped)).toBe(0.75);
    expect(await score('BatchAccuracy', dropped)).toBe(0.75);
  });

  it('penalises a true positive marked false_positive, not a benign one marked true_positive', async () => {
    const closedMalicious = ['false_positive', 'true_positive', 'false_positive', 'false_positive'];
    expect(await score('MaliciousNotClosed', closedMalicious)).toBe(0.5);
    expect(await score('BenignNotEscalated', closedMalicious)).toBe(1);

    const escalatedBenign = ['true_positive', 'true_positive', 'true_positive', 'false_positive'];
    expect(await score('MaliciousNotClosed', escalatedBenign)).toBe(1);
    expect(await score('BenignNotEscalated', escalatedBenign)).toBe(0.5);
  });

  it('flags alerts with identical evidence that got different verdicts', async () => {
    const split = ['true_positive', 'false_positive', 'false_positive', 'false_positive'];
    expect(await score('VerdictConsistency', split)).toBe(0.5);
  });

  it('scores the hard shapes on their own, and skips batches that have none', async () => {
    // Only index 1 (true_positive) and 3 (false_positive) are hard; the model misses index 3.
    const missedHard = ['true_positive', 'true_positive', 'false_positive', 'true_positive'];
    expect(await score('HardShapeAccuracy', missedHard)).toBe(0.5);
    expect(await score('BatchAccuracy', missedHard)).toBe(0.75);

    const evaluator = batchEvaluators.find((e) => e.name === 'HardShapeAccuracy');
    const result = await evaluator?.evaluate({
      input: {},
      expected: { ...expected, hard: [false, false, false, false] },
      output: { predictions: [{}, {}, {}, {}], executionStatus: 'completed' },
      metadata: {},
    } as never);
    expect(result?.score).toBeNull();
  });
});
