/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Classification } from './constants';
import { maliciousNotClosed, perClassAccuracyEvaluators } from './per_class_evaluators';
import { ALERT_ANALYSIS_EVAL_ALERTS } from './synthetic_alerts';

const run = (evaluator: Evaluator, predicted: Classification | undefined, expected: string) =>
  evaluator.evaluate({
    input: {},
    output: { classification: predicted },
    expected: { classification: expected },
    metadata: {},
  } as unknown as Parameters<Evaluator['evaluate']>[0]);

const byName = (name: string): Evaluator =>
  perClassAccuracyEvaluators.find((evaluator) => evaluator.name === name) as Evaluator;

describe('per-class accuracy', () => {
  it('has one evaluator per class', () => {
    expect(perClassAccuracyEvaluators.map(({ name }) => name)).toEqual([
      'Accuracy:true_positive',
      'Accuracy:false_positive',
      'Accuracy:inconclusive',
    ]);
  });

  it('scores only examples of its own class', async () => {
    const inconclusive = byName('Accuracy:inconclusive');
    expect((await run(inconclusive, 'inconclusive', 'inconclusive')).score).toBe(1);
    expect((await run(inconclusive, 'false_positive', 'inconclusive')).score).toBe(0);
    expect((await run(inconclusive, undefined, 'inconclusive')).score).toBe(0);
    expect((await run(inconclusive, 'inconclusive', 'true_positive')).score).toBeNull();
  });
});

describe('maliciousNotClosed', () => {
  it('fails only a true positive classified false_positive', async () => {
    expect((await run(maliciousNotClosed, 'false_positive', 'true_positive')).score).toBe(0);
    expect((await run(maliciousNotClosed, 'inconclusive', 'true_positive')).score).toBe(1);
    expect((await run(maliciousNotClosed, 'true_positive', 'true_positive')).score).toBe(1);
  });

  it('does not score examples that are not true positives', async () => {
    expect((await run(maliciousNotClosed, 'false_positive', 'false_positive')).score).toBeNull();
    expect((await run(maliciousNotClosed, 'false_positive', 'inconclusive')).score).toBeNull();
  });
});

describe('evidence-free inconclusive alerts', () => {
  const inconclusive = ALERT_ANALYSIS_EVAL_ALERTS.filter(
    ({ expected }) => expected === 'inconclusive'
  );

  // The prompt renders these fields as evidence; any of them would make "no evidence" a lie.
  const EVIDENCE_FIELDS = [
    'process.name',
    'process.executable',
    'process.command_line',
    'process.working_directory',
    'process.hash.sha256',
    'process.parent.name',
    'user.name',
    'file.path',
    'file.name',
    'url.full',
    'source.ip',
    'destination.ip',
    'event.action',
    'host.os.name',
  ];

  it('has at least two', () => {
    expect(inconclusive.length).toBeGreaterThanOrEqual(2);
  });

  it.each(inconclusive.map((alert) => [alert.id, alert] as const))(
    '%s carries no action, actor or parameter fields',
    (_id, alert) => {
      const present = EVIDENCE_FIELDS.filter((field) => alert.doc[field] !== undefined);
      expect(present).toEqual([]);
    }
  );

  it('has unique ids', () => {
    const ids = ALERT_ANALYSIS_EVAL_ALERTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
