/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Classification } from './constants';
import { maliciousNotClosed, perClassAccuracyEvaluators } from './per_class_evaluators';
import { ALERT_ANALYSIS_EVAL_ALERTS, RENDERED_NOISE_KEYS } from './synthetic_alerts';

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
  it('is named apart from the batch evaluator', () => {
    expect(maliciousNotClosed.name).toBe('MaliciousNotClosed:example');
  });

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

  // Fields the `build_agent_message` template renders into the alert block as action, actor or
  // parameter evidence, plus the noise-envelope fields it also renders (`RENDERED_NOISE_KEYS`).
  // Any of them present would make "no evidence" untrue.
  const TEMPLATE_RENDERED_EVIDENCE_FIELDS = [
    'event.action',
    'event.outcome',
    'event.type',
    'event.category',
    'event.code',
    'user.name',
    'user.domain',
    'user.id',
    'host.hostname',
    'process.name',
    'process.executable',
    'process.command_line',
    'process.code_signature.exists',
    'process.code_signature.trusted',
    'process.code_signature.subject_name',
    'process.parent.name',
    'process.parent.command_line',
    'process.parent.executable',
    'process.parent.code_signature.trusted',
    'process.parent.code_signature.subject_name',
    'file.path',
    'file.name',
    'file.hash.sha256',
    'source.ip',
    'source.port',
    'destination.ip',
    'destination.port',
    'network.protocol',
    'url.full',
    'dns.question.name',
    'cloud.account.id',
    'aws.cloudtrail.user_identity.arn',
    'azure.auditlogs.properties.initiated_by.user.user_principal_name',
    'gcp.audit.authentication_info.principal_email',
  ];
  const EVIDENCE_FIELDS = [...TEMPLATE_RENDERED_EVIDENCE_FIELDS, ...RENDERED_NOISE_KEYS];

  it.each(inconclusive.map((alert) => [alert.id, alert] as const))(
    '%s carries no action, actor or parameter fields',
    (_id, alert) => {
      const present = EVIDENCE_FIELDS.filter((field) => alert.doc[field] !== undefined);
      expect(present).toEqual([]);
    }
  );

  it('has exactly two', () => {
    expect(inconclusive.map(({ id }) => id)).toEqual([
      'aa-eval-inconclusive-no-evidence',
      'aa-eval-inconclusive-cloud-no-principal',
    ]);
  });

  it('has unique ids', () => {
    const ids = ALERT_ANALYSIS_EVAL_ALERTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('hard-boundary alerts', () => {
  const hard = ALERT_ANALYSIS_EVAL_ALERTS.filter(({ id }) => id.startsWith('aa-eval-hard-'));

  it('has the three hard alerts', () => {
    expect(hard).toHaveLength(3);
  });

  it.each(hard.map((alert) => [alert.id, alert] as const))(
    '%s does not carry noise-envelope fields the prompt renders',
    (_id, alert) => {
      const present = RENDERED_NOISE_KEYS.filter((key) => alert.doc[key] !== undefined);
      expect(present).toEqual([]);
    }
  );
});
