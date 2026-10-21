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

export const FORBIDDEN_TOOLS_EVALUATOR_NAME = 'ForbiddenTools';

const FORBIDDEN_TOOL_PATTERNS: Array<{
  toolId: string;
  skill?: string;
  description: string;
}> = [
  {
    toolId: 'load_skill',
    skill: 'attack-discovery-alert-retrieval-builder',
    description: 'unneeded alert-retrieval skill',
  },
  {
    toolId: 'platform.core.generate_esql',
    description: 'rewriting the default ES|QL query instead of using it as-is',
  },
  {
    toolId: 'platform.core.get_document_by_id',
    description: 'fetching individual alert documents after ES|QL already returned them',
  },
];

export const createForbiddenToolsEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => {
  return {
    name: FORBIDDEN_TOOLS_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, input }) => {
      const toolCalls = (output?.steps ?? []).filter(
        (step) => (step as { type?: string }).type === 'tool_call' && step.tool_id
      );
      const violations = toolCalls
        .map((step) => {
          const matching = FORBIDDEN_TOOL_PATTERNS.find((pattern) => {
            if (step.tool_id !== pattern.toolId) return false;
            if (pattern.skill) {
              const skillParam = (step.params as Record<string, unknown> | undefined)?.skill;
              return skillParam === pattern.skill;
            }
            return true;
          });
          return matching
            ? {
                toolId: step.tool_id,
                skill: (step.params as Record<string, unknown>)?.skill as string | undefined,
                description: matching.description,
              }
            : undefined;
        })
        .filter((v): v is NonNullable<typeof v> => v !== undefined);

      const triageType = input?.triageType ?? 'unknown';
      const isLiveRetrieval = triageType === 'live-retrieval';

      // For provided-alerts, the only forbidden action is loading the retrieval skill.
      const relevantViolations = isLiveRetrieval
        ? violations
        : violations.filter((v) => v.skill === 'attack-discovery-alert-retrieval-builder');

      if (relevantViolations.length > 0) {
        return {
          score: 0,
          label: 'forbidden_tool_used',
          explanation: `Forbidden tools used: ${relevantViolations
            .map((v) => `${v.toolId}${v.skill ? ` (${v.skill})` : ''} — ${v.description}`)
            .join('; ')}.`,
          metadata: { violations: relevantViolations },
        };
      }

      return {
        score: 1,
        label: 'ok',
        explanation: 'No forbidden tools used.',
      };
    },
  };
};
