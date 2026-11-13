/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator, type TaskOutput } from '@kbn/evals';
import type { SecurityDatasetExample } from './evaluate_dataset';

/**
 * Mirrors `GENERATE_INSIGHT_TOOL_ID` of the automatic troubleshooting skill
 * (`security_solution/server/agent_builder/skills/automatic_troubleshooting/index.ts`),
 * which cannot be imported from a functional-tests package.
 */
export const GENERATE_INSIGHT_TOOL_ID = 'automatic_troubleshooting.generate_insight';

const TROUBLESHOOTING_TOOL_USAGE_EVALUATOR_NAME = 'Troubleshooting Tool Usage';

type ToolCallStep = ReturnType<typeof getToolCallSteps>[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasErrorResult = ({ results = [] }: ToolCallStep): boolean =>
  results.some((result) => isRecord(result) && result.type === 'error');

const MAX_GENERATE_INSIGHT_CALLS_AFTER_ERROR = 1;

const exceedsGenerateInsightRetryCap = (steps: ToolCallStep[]): boolean => {
  const generateInsightSteps = steps.filter((step) => step.tool_id === GENERATE_INSIGHT_TOOL_ID);
  const firstErrorIndex = generateInsightSteps.findIndex(hasErrorResult);

  return (
    firstErrorIndex !== -1 &&
    generateInsightSteps.length - firstErrorIndex - 1 > MAX_GENERATE_INSIGHT_CALLS_AFTER_ERROR
  );
};

/**
 * Deterministic tool usage evaluator for troubleshooting answers: enforces the optional
 * `max_tool_calls` budget and `forbidden_tools`, and always fails when `generate_insight`
 * is called more than once after it returned an error.
 */
export function createTroubleshootingToolUsageEvaluator(): Evaluator<
  SecurityDatasetExample,
  TaskOutput
> {
  return {
    name: TROUBLESHOOTING_TOOL_USAGE_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const steps = getToolCallSteps(output);
      const maxToolCalls = expected?.max_tool_calls;
      const forbiddenTools = expected?.forbidden_tools ?? [];

      const withinBudget = maxToolCalls === undefined || steps.length <= maxToolCalls;
      const forbiddenToolsAbsent = steps.every(
        (step) => typeof step.tool_id !== 'string' || !forbiddenTools.includes(step.tool_id)
      );
      const passed = withinBudget && forbiddenToolsAbsent && !exceedsGenerateInsightRetryCap(steps);

      return {
        score: passed ? 1 : 0,
        label: passed ? 'pass' : 'fail',
      };
    },
  };
}
