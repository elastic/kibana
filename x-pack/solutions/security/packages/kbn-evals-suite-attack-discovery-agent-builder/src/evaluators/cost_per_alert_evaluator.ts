/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator } from '@kbn/evals';
import { partitionToolCalls } from './tool_call_accounting';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

export const COST_PER_ALERT_EVALUATOR_NAME = 'CostPerAlert';

export const createCostPerAlertEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => {
  return {
    name: COST_PER_ALERT_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ input, output }) => {
      const toolSteps = getToolCallSteps(output);
      // Cost is what the model spent investigating. The harness call, the
      // platform's plan-tracking and report write-back, and the fixture's own
      // attachment read are paid for by the run itself, not chosen by the model
      // (`partitionToolCalls` is the same split `StrictTrajectory` grades
      // precision over, so the two metrics stay comparable).
      const { investigativeToolCalls, excludedToolCalls } = partitionToolCalls(
        toolSteps.map((step) => step.tool_id).filter((toolId): toolId is string => Boolean(toolId)),
        input
      );
      const passedAlertCount = output?.workflow?.passedAlertCount ?? null;

      if (passedAlertCount == null || passedAlertCount === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No passed alert count available to compute cost-per-alert.',
          metadata: {
            toolCalls: toolSteps.length,
            investigativeToolCalls: investigativeToolCalls.length,
            excludedToolCalls: excludedToolCalls.length,
            passedAlertCount,
          },
        };
      }

      const toolCallsPerAlert = investigativeToolCalls.length / passedAlertCount;
      // Gate: more than 5 investigative tool calls per alert is considered inefficient.
      const score = toolCallsPerAlert <= 5 ? 1 : 0;

      return {
        score,
        label: score === 1 ? 'ok' : 'inefficient',
        explanation: `${
          investigativeToolCalls.length
        } investigative tool calls for ${passedAlertCount} alerts (${toolCallsPerAlert.toFixed(
          2
        )} calls/alert), ${excludedToolCalls.length} platform bookkeeping calls excluded.`,
        metadata: {
          toolCalls: toolSteps.length,
          investigativeToolCalls: investigativeToolCalls.length,
          excludedToolCalls: excludedToolCalls.length,
          passedAlertCount,
          toolCallsPerAlert,
        },
      };
    },
  };
};
