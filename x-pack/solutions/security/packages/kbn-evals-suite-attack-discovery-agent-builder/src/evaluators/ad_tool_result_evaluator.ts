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

export const AD_TOOL_RESULT_EVALUATOR_NAME = 'AdToolResult';

export const createAdToolResultEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: AD_TOOL_RESULT_EVALUATOR_NAME,
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const status = output.adToolResult?.status ?? null;
    const discoveryCount = output.adToolResult?.discoveryCount ?? null;
    const success = status === 'completed' && discoveryCount != null && discoveryCount > 0;

    return {
      score: success ? 1 : 0,
      metadata: {
        status,
        discoveryCount,
      },
    };
  },
});
