/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type Evaluator } from '@kbn/evals';
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
    evaluate: async ({ output }) => {
      const toolCalls = getToolCallSteps(output).length;
      const passedAlertCount = output?.workflow?.passedAlertCount ?? null;

      if (passedAlertCount == null || passedAlertCount === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No passed alert count available to compute cost-per-alert.',
          metadata: { toolCalls, passedAlertCount },
        };
      }

      const toolCallsPerAlert = toolCalls / passedAlertCount;
      // Gate: more than 5 tool calls per alert is considered inefficient.
      const score = toolCallsPerAlert <= 5 ? 1 : 0;

      return {
        score,
        label: score === 1 ? 'ok' : 'inefficient',
        explanation: `${toolCalls} tool calls for ${passedAlertCount} alerts (${toolCallsPerAlert.toFixed(
          2
        )} calls/alert).`,
        metadata: {
          toolCalls,
          passedAlertCount,
          toolCallsPerAlert,
        },
      };
    },
  };
};
