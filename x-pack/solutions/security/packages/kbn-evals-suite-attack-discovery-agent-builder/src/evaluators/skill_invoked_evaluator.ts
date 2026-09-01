/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

export const SKILL_INVOKED_EVALUATOR_NAME = 'Skill Invoked';

const isString = (value: unknown): value is string => typeof value === 'string';

interface ToolCallStep {
  tool_id?: string;
  results?: unknown[];
  params?: Record<string, unknown>;
}

const getToolCallStepsWithParams = (
  output: AttackDiscoveryAgentBuilderTaskOutput
): ToolCallStep[] =>
  (output.steps ?? [])
    .filter((step) => (step as { type?: string }).type === 'tool_call')
    .map((step) => ({
      tool_id: step.tool_id,
      results: step.results,
      params: (step as { params?: Record<string, unknown> }).params,
    }));

const extractSkillNamesFromLoadSkillStep = (step: ToolCallStep): string[] => {
  const names: string[] = [];
  if (step.tool_id !== 'load_skill') return names;

  const skillParam = step.params?.skill;
  if (isString(skillParam)) names.push(skillParam);

  for (const result of step.results ?? []) {
    const data = (result as { data?: { skill?: { id?: string; name?: string } } } | undefined)
      ?.data;
    if (isString(data?.skill?.id)) names.push(data.skill.id);
    if (isString(data?.skill?.name)) names.push(data.skill.name);
  }

  return names;
};

// Reads `expectedSkills` from the CURRENT example's input rather than a
// dataset-wide union. A dataset-wide union false-passes any example whose
// invoked skill merely belongs to another example's expectation — latent
// today because every example in this dataset expects the same single skill,
// but wrong the moment a mixed dataset lands.
export const createResponseSkillInvocationEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: SKILL_INVOKED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, input }) => {
    const expectedSkills = input?.expectedSkills ?? [];

    if (expectedSkills.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expected skills defined for this example.',
      };
    }

    const toolCalls = getToolCallStepsWithParams(output);
    const invokedSkillNames = new Set(
      toolCalls.flatMap((step) => extractSkillNamesFromLoadSkillStep(step))
    );
    const invoked = Array.from(invokedSkillNames);

    const matched = expectedSkills.filter((expected) =>
      invoked.some(
        (name) =>
          name.toLowerCase().includes(expected.toLowerCase()) ||
          expected.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (matched.length === 0) {
      return {
        score: 0,
        explanation: `Expected skill(s) not loaded. Invoked: ${invoked.join(', ') || 'none'}.`,
      };
    }

    return {
      score: 1,
      explanation: `Expected skill(s) loaded: ${matched.join(', ')}.`,
      metadata: { invokedSkills: invoked },
    };
  },
});
