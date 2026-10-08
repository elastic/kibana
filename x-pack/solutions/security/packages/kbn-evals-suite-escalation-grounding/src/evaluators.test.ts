/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { escalationCases } from './dataset';
import {
  chatAnswerRecall,
  createClaimGroundingEvaluator,
  hallucinationCount,
  summaryPlantedFactRecall,
} from './evaluators';
import type { EscalationCase, EscalationTaskOutput } from './types';

const case01 = escalationCases[0];

const log = { info: () => undefined, warning: () => undefined } as never;

const fakeInference = (output: unknown): BoundInferenceClient =>
  ({ output: async () => output } as unknown as BoundInferenceClient);

const run = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluator: Evaluator<any, any>,
  output: EscalationTaskOutput,
  c: EscalationCase
) =>
  evaluator.evaluate({
    input: {},
    output,
    expected: { c },
    metadata: null,
  }) as unknown as Promise<{
    score: number;
    label?: string;
  }>;

describe('summaryPlantedFactRecall', () => {
  it('full-coverage summary scores 1', async () => {
    const summary = case01.plantedFacts.map((f) => f.text).join(' ');
    const result = await run(
      summaryPlantedFactRecall,
      { caseId: case01.id, escalationId: 'e', investigationIds: [], summary, answers: {} },
      case01
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe(`${case01.plantedFacts.length}/${case01.plantedFacts.length}`);
  });

  it('missing summary scores 0 with missing-summary label', async () => {
    const result = await run(
      summaryPlantedFactRecall,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: undefined,
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(0);
  });

  it('partial summary scores the covered fraction', async () => {
    const result = await run(
      summaryPlantedFactRecall,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: 'svc_backup was cracked.',
        answers: {},
      },
      case01
    );
    expect(result.score).toBeCloseTo(1 / case01.plantedFacts.length);
  });
});

describe('chatAnswerRecall', () => {
  const output = (answers: Record<string, string | undefined>): EscalationTaskOutput => ({
    caseId: case01.id,
    escalationId: 'e',
    investigationIds: [],
    summary: 's',
    answers,
  });

  it('scores 1 when every answer carries its fact key', async () => {
    const answers = Object.fromEntries(case01.questions.map((q) => [q.id, q.answer]));
    const result = await run(chatAnswerRecall, output(answers), case01);
    expect(result.score).toBe(1);
  });

  it('a failed chat round counts as a miss', async () => {
    const answers = Object.fromEntries(
      case01.questions.map((q) => [q.id, q.id === 'q3' ? undefined : q.answer])
    );
    const result = await run(chatAnswerRecall, output(answers), case01);
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it('an answer without the key token is a miss', async () => {
    const answers = Object.fromEntries(
      case01.questions.map((q) => [q.id, 'I could not find that information.'])
    );
    const result = await run(chatAnswerRecall, output(answers), case01);
    expect(result.score).toBe(0);
  });
});

describe('hallucinationCount', () => {
  it('counts ungrounded specific sentences', async () => {
    const result = await run(
      hallucinationCount,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary:
          'WEB01 fetched the stage from 198.51.100.7. The attacker then exfiltrated to 10.99.99.99.',
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(1);
  });
});

describe('createClaimGroundingEvaluator', () => {
  it('grounds a faithful summary at 1', async () => {
    const evaluator = createClaimGroundingEvaluator({
      inferenceClient: fakeInference({
        output: {
          claims: [
            { claim: 'WEB01 fetched from 198.51.100.7', grounded: true },
            { claim: 'svc_backup was cracked', grounded: true },
          ],
        },
      }),
      log,
    });
    const result = await run(
      evaluator,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: 'WEB01 fetched from 198.51.100.7. svc_backup was cracked.',
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(1);
  });

  it('half-grounded summary scores 0.5', async () => {
    const evaluator = createClaimGroundingEvaluator({
      inferenceClient: fakeInference({
        output: {
          claims: [
            { claim: 'grounded', grounded: true },
            { claim: 'invented', grounded: false },
          ],
        },
      }),
      log,
    });
    const result = await run(
      evaluator,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: 'Half right, half invented.',
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(0.5);
  });

  it('missing summary scores 0 with missing-summary label', async () => {
    const evaluator = createClaimGroundingEvaluator({
      inferenceClient: fakeInference({ output: { claims: [] } }),
      log,
    });
    const result = await run(
      evaluator,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: undefined,
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(0);
  });

  it('a judge returning no claims fails the case', async () => {
    const evaluator = createClaimGroundingEvaluator({
      inferenceClient: fakeInference({ output: { claims: [] } }),
      log,
    });
    const result = await run(
      evaluator,
      {
        caseId: case01.id,
        escalationId: 'e',
        investigationIds: [],
        summary: 'Some summary.',
        answers: {},
      },
      case01
    );
    expect(result.score).toBe(0);
  });
});
