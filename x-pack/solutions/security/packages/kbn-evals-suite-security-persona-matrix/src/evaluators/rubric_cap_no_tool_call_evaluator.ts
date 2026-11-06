/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { getOrderedToolCalls } from './task_output_helpers';

export const RUBRIC_CAP_NO_TOOL_CALL_EVALUATOR_NAME = 'RubricCapNoToolCall';

/** Rubric score ceiling for an answer produced without calling any tool. */
export const NO_TOOL_CALL_RUBRIC_CAP = 6;

/** Informational: flags runs the rubric should cap because no tool was called. */
export const createRubricCapNoToolCallEvaluator = (): Evaluator => ({
  name: RUBRIC_CAP_NO_TOOL_CALL_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) => {
    const noToolCall = getOrderedToolCalls(output).length === 0;
    return {
      score: null,
      label: noToolCall ? 'capped' : 'uncapped',
      explanation: noToolCall
        ? `No tool was called; rubric score is capped at ${NO_TOOL_CALL_RUBRIC_CAP}.`
        : 'At least one tool was called; no rubric cap.',
      metadata: {
        no_tool_call: noToolCall,
        rubric_cap: noToolCall ? NO_TOOL_CALL_RUBRIC_CAP : null,
      },
    };
  },
});
