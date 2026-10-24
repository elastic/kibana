/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTrajectoryEvaluator } from '@kbn/evals';
import type { Evaluator } from '@kbn/evals';
import { getAgentBuilderToolCalls } from './agent_builder_tool_classifier';
import type { ToolCallClass, TrajectoryToolCall } from './agent_builder_tool_classifier';

const UNCLASSIFIED_TOOL_EXPLANATION_PREFIX = 'unclassified-tool:';

const unique = (ids: string[]): string[] => [...new Set(ids)];

/** What the wrapped upstream evaluator sees: only the calls that take part in scoring. */
interface ScoredCalls {
  scoredToolIds: string[];
}

/**
 * Trajectory evaluator for Agent Builder runs. Composes the upstream `createTrajectoryEvaluator`
 * (LCS order + coverage scoring is unchanged) and classifies tool calls in front of it:
 * - golden tools are always scored;
 * - `runtime` calls are dropped before scoring, so scaffolding such as `attachments.read` or
 *   `write_todos` neither fails the no-tools-expected guardrail nor counts as an extra tool;
 * - any `unclassified` call makes the result N/A (`score: null`, explanation
 *   `unclassified-tool:<ids>`) instead of a misleading score.
 *
 * @param config.extractToolCalls - Extracts tool calls with their origin. Defaults to the round
 *   steps of an Agent Builder converse output.
 */
export function createSecurityTrajectoryEvaluator(config: {
  classifyTool: (call: TrajectoryToolCall) => ToolCallClass;
  goldenPathExtractor: (expected: unknown) => string[];
  extractToolCalls?: (output: unknown) => Array<string | TrajectoryToolCall>;
  orderWeight?: number;
  coverageWeight?: number;
}): Evaluator {
  const {
    classifyTool,
    goldenPathExtractor,
    extractToolCalls = getAgentBuilderToolCalls,
    orderWeight,
    coverageWeight,
  } = config;

  const upstream = createTrajectoryEvaluator({
    extractToolCalls: (output) => (output as ScoredCalls).scoredToolIds,
    goldenPathExtractor,
    orderWeight,
    coverageWeight,
  });

  return {
    ...upstream,
    evaluate: async (params) => {
      const calls = extractToolCalls(params.output).map((call) =>
        typeof call === 'string' ? { id: call } : call
      );
      const goldenSet = new Set(goldenPathExtractor(params.expected));

      const runtimeToolIds: string[] = [];
      const unclassifiedToolIds: string[] = [];
      const scoredToolIds: string[] = [];
      for (const call of calls) {
        const toolClass = goldenSet.has(call.id) ? 'scored' : classifyTool(call);
        if (toolClass === 'runtime') {
          runtimeToolIds.push(call.id);
        } else if (toolClass === 'unclassified') {
          unclassifiedToolIds.push(call.id);
        } else {
          scoredToolIds.push(call.id);
        }
      }

      if (unclassifiedToolIds.length > 0) {
        const ids = unique(unclassifiedToolIds);
        return {
          score: null,
          label: 'N/A',
          explanation: `${UNCLASSIFIED_TOOL_EXPLANATION_PREFIX}${ids.join(',')}`,
          metadata: { unclassifiedToolIds: ids, runtimeToolIds: unique(runtimeToolIds) },
        };
      }

      const result = await upstream.evaluate({
        ...params,
        output: { scoredToolIds } as ScoredCalls,
      });
      return {
        ...result,
        metadata: { ...result.metadata, runtimeToolIds: unique(runtimeToolIds) },
      };
    },
  };
}
