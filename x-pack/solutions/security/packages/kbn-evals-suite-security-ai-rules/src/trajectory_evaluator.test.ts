/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@kbn/evals` re-exports Scout tags, which pulls Playwright into the jest environment and
// never resolves here. Mock the package: this file only needs to assert how the suite
// configures the shared evaluator and how it derives the golden sequence.
jest.mock('@kbn/evals', () => ({
  createTrajectoryEvaluator: jest.fn(() => ({
    name: 'trajectory',
    kind: 'CODE',
    evaluate: jest.fn(),
  })),
  createEsqlEquivalenceEvaluator: jest.fn(),
  createSkillInvocationEvaluator: jest.fn(),
  selectEvaluators: jest.fn(),
}));

import { createTrajectoryEvaluator } from '@kbn/evals';
import type { ReferenceRule } from '../datasets/sample_rules';
import { createRuleTrajectoryEvaluator, defaultGoldenSequence } from './evaluate_dataset';

const CANONICAL_TOOL = 'security.create_detection_rule';

const positiveRule: Partial<ReferenceRule> = { category: 'credential_access' };
const negativeRule: Partial<ReferenceRule> = { category: 'negative' };

const mockCreateTrajectoryEvaluator = createTrajectoryEvaluator as unknown as jest.Mock;

describe('Tool Trajectory evaluator configuration', () => {
  beforeEach(() => {
    mockCreateTrajectoryEvaluator.mockClear();
  });

  it('enforces the advertised exact sequence via penalizeExtraCalls', () => {
    createRuleTrajectoryEvaluator();

    // Both order and coverage are divided by the golden path alone, so without this flag a
    // single expected call scores 1.0 for any sequence that contains it — including
    // `attachment_update` calls and a duplicated `security.create_detection_rule`. The
    // penalty's scoring behaviour is covered in @kbn/evals' trajectory evaluator tests.
    expect(mockCreateTrajectoryEvaluator).toHaveBeenCalledWith(
      expect.objectContaining({
        penalizeExtraCalls: true,
        orderWeight: 0.4,
        coverageWeight: 0.6,
      })
    );
  });

  it('reads observed tool calls from the task output', () => {
    createRuleTrajectoryEvaluator();

    const config = mockCreateTrajectoryEvaluator.mock.calls[0][0] as {
      extractToolCalls: (output: unknown) => string[];
    };

    expect(config.extractToolCalls({ toolCalls: [CANONICAL_TOOL] })).toEqual([CANONICAL_TOOL]);
    expect(config.extractToolCalls({})).toEqual([]);
  });

  it('names the report column "Tool Trajectory"', () => {
    expect(createRuleTrajectoryEvaluator().name).toBe('Tool Trajectory');
  });
});

describe('defaultGoldenSequence', () => {
  it('expects no tools for negative cases', () => {
    expect(defaultGoldenSequence(negativeRule)).toEqual([]);
  });

  it('expects the canonical creation tool for positive cases', () => {
    expect(defaultGoldenSequence(positiveRule)).toEqual([CANONICAL_TOOL]);
  });

  it('lets an explicit tool_sequence override the default', () => {
    expect(defaultGoldenSequence({ ...positiveRule, tool_sequence: ['a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('prefers an explicit empty tool_sequence over the positive default', () => {
    expect(defaultGoldenSequence({ ...positiveRule, tool_sequence: [] })).toEqual([]);
  });
});
