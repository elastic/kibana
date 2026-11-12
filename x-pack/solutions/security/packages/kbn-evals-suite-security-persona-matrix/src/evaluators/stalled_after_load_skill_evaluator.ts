/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { getClosingAnswer, getOrderedToolCalls, getSteps } from './task_output_helpers';

export const STALLED_AFTER_LOAD_SKILL_EVALUATOR_NAME = 'StalledAfterLoadSkill';

const LOAD_SKILL_TOOL_ID = 'load_skill';

/**
 * Some models load a skill and then stop: the run ends on the `load_skill`
 * tool call with no closing message. Scores 0 for that shape only.
 */
export const createStalledAfterLoadSkillEvaluator = (): Evaluator => ({
  name: STALLED_AFTER_LOAD_SKILL_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const lastToolStep = getSteps(output)
      .filter((step) => step.type === 'tool_call')
      .pop();
    const endedOnLoadSkill = lastToolStep?.tool_id === LOAD_SKILL_TOOL_ID;
    // Steps after the last tool call (reasoning) do not count as a tool call
    // following load_skill, but a closing message does count as an answer.
    const stalled = endedOnLoadSkill && getClosingAnswer(output).trim() === '';
    return {
      score: stalled ? 0 : 1,
      explanation: stalled
        ? 'The run ended on load_skill with no final answer.'
        : 'The run did not stall after loading a skill.',
      metadata: { stalled, tool_calls: getOrderedToolCalls(output).length },
    };
  },
});
