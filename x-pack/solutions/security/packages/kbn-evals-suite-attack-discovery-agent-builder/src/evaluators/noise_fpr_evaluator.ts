/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

const collectInsightAlertIds = (insights: AttackDiscovery[] | null | undefined): string[] => {
  if (!insights || !Array.isArray(insights)) {
    return [];
  }
  return insights.flatMap((insight) => insight.alertIds ?? []);
};

export const createNoiseFalsePositiveEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'NoiseFalsePositive',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const forbiddenAlertIds = expected?.forbiddenAlertIds ?? [];
    if (forbiddenAlertIds.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No forbidden noise alert IDs defined for this example.',
      };
    }

    const citedAlertIds = collectInsightAlertIds(output.insights);
    const violations = citedAlertIds.filter((alertId) => forbiddenAlertIds.includes(alertId));

    if (violations.length > 0) {
      return {
        score: 0,
        explanation: `Insights cited ${violations.length} noise alert(s): ${violations.join(', ')}`,
        metadata: { violations, citedAlertIds },
      };
    }

    return {
      score: 1,
      explanation: 'No noise-cluster or background alert IDs cited in insights.',
      metadata: { citedAlertIds },
    };
  },
});

export const createDiscoveryCountCapEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'DiscoveryCountCap',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const maxDiscoveryCount = expected?.maxDiscoveryCount;
    if (maxDiscoveryCount == null) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No discovery count cap defined for this example.',
      };
    }

    const discoveryCount =
      output.adToolResult?.discoveryCount ??
      output.workflow.validatedDiscoveryCount ??
      output.insights?.length ??
      0;

    if (discoveryCount > maxDiscoveryCount) {
      return {
        score: 0,
        explanation: `Discovery count ${discoveryCount} exceeds cap ${maxDiscoveryCount}.`,
        metadata: { discoveryCount, maxDiscoveryCount },
      };
    }

    return {
      score: 1,
      explanation: `Discovery count ${discoveryCount} is within cap ${maxDiscoveryCount}.`,
      metadata: { discoveryCount, maxDiscoveryCount },
    };
  },
});

export const createMinValidatedDiscoveryEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'MinValidatedDiscovery',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const minValidatedDiscoveryCount = expected?.minValidatedDiscoveryCount;
    if (minValidatedDiscoveryCount == null) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No minimum validated discovery count defined for this example.',
      };
    }

    const validatedCount =
      output.workflow.validatedDiscoveryCount ??
      output.adToolResult?.discoveryCount ??
      output.insights?.length ??
      0;

    if (validatedCount < minValidatedDiscoveryCount) {
      return {
        score: 0,
        explanation: `Validated discovery count ${validatedCount} is below minimum ${minValidatedDiscoveryCount}.`,
        metadata: { validatedCount, minValidatedDiscoveryCount },
      };
    }

    return {
      score: 1,
      explanation: `Validated discovery count ${validatedCount} meets minimum ${minValidatedDiscoveryCount}.`,
      metadata: { validatedCount, minValidatedDiscoveryCount },
    };
  },
});
