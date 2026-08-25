/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createResponseSkillInvocationEvaluator } from './skill_invoked_evaluator';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const loadSkillStep = (skillId: string) => ({
  type: 'tool_call',
  tool_id: 'load_skill',
  params: { skill: skillId },
  results: [],
});

const baseOutput = (steps: AttackDiscoveryAgentBuilderTaskOutput['steps']) => ({
  messages: [],
  steps,
  errors: [],
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    passedAlertCount: null,
    validatedDiscoveryCount: null,
  },
});

describe('createResponseSkillInvocationEvaluator', () => {
  const evaluator = createResponseSkillInvocationEvaluator();

  // Fix 4: expectedSkills must be read from the CURRENT example's input, not
  // a dataset-wide union. Pre-fix, an example expecting skill A would
  // false-pass off skill B merely because another example in the dataset
  // expected B.
  it('scores 0 when the example expects skill A but only skill B was loaded', async () => {
    const params: Params = {
      input: { expectedSkills: ['skill-a'] } as Params['input'],
      output: baseOutput([loadSkillStep('skill-b')]),
      expected: {} as Params['expected'],
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(0);
  });

  it('scores 1 when the example expects skill A and skill A was loaded, even if another example expects skill B', async () => {
    const params: Params = {
      input: { expectedSkills: ['skill-a'] } as Params['input'],
      output: baseOutput([loadSkillStep('skill-a')]),
      expected: {} as Params['expected'],
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(1);
  });

  it('returns N/A when the example has no expected skills', async () => {
    const params: Params = {
      input: { expectedSkills: [] } as unknown as Params['input'],
      output: baseOutput([loadSkillStep('skill-a')]),
      expected: {} as Params['expected'],
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});
