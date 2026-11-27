/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createTrajectoryEvaluator,
  getToolCallSteps,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvaluationDataset,
  type Evaluator,
  type EvalsExecutorClient,
  type Example,
  type TaskOutput,
} from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';
import { createEndpointCriteriaEvaluator } from './evaluate_dataset';
// Security-owned fork: also scores load_skill spans (platform createSkillInvocationEvaluator is filestore.read only).
import { createSecuritySkillInvocationEvaluator } from './security_skill_invocation_evaluator';

/** Must match defineSkillType({ name }) in endpoint_forensic_analysis_skill.ts */
export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_NAME = 'endpoint-forensic-analysis';

/** Score labels of the forbidden-tool guardrail (one per outcome, so a report can tell them apart). */
export const FORBIDDEN_TOOLS_ABSENT_LABEL = 'forbidden_tools_absent';
export const FORBIDDEN_TOOLS_USED_LABEL = 'forbidden_tools_used';

export interface ForensicDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    tool_sequence?: string[];
    /**
     * Tools this example must NOT call — the mechanical form of a negative criterion.
     *
     * A row that declares this is scored on the guardrail instead of on a golden path:
     * 1 when none of the listed tools ran, 0 when at least one did. That is what makes a
     * distractor row measurable: it has no golden path to align against (declaring
     * `tool_sequence: []` would mean "call no tools at all", which is false — distractors
     * legitimately call platform.core.sml_search and load_skill), but its criteria already
     * state what it must not do, e.g. 'Does not query logs-endpoint.events.* indices for
     * DFIR purposes'.
     */
    forbidden_tool_sequence?: string[];
  };
  metadata?: Record<string, unknown>;
}

export type EvaluateForensicDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: ForensicDatasetExample[];
  };
}) => Promise<void>;

const FILESTORE_READ_TOOL_ID = 'filestore.read';
const LOAD_SKILL_TOOL_ID = 'load_skill';

const SKILL_ROUTING_TOOL_IDS = new Set([FILESTORE_READ_TOOL_ID, LOAD_SKILL_TOOL_ID]);

const extractToolCalls = (output: TaskOutput): string[] =>
  getToolCallSteps(output)
    .map((step) => step.tool_id)
    .filter((id): id is string => typeof id === 'string' && !SKILL_ROUTING_TOOL_IDS.has(id));

/**
 * Scores a negative guardrail: 1 when none of the forbidden tools ran, 0 when one did.
 * Shared with the trajectory evaluator so a forbidden-tool row and a golden-path row read the
 * same tool calls out of the same task output (skill-routing tools excluded on both paths).
 */
const evaluateForbiddenTools = (forbidden: string[], output: TaskOutput) => {
  const actual = extractToolCalls(output);
  const used = Array.from(new Set(actual.filter((toolId) => forbidden.includes(toolId))));

  if (used.length === 0) {
    return {
      score: 1,
      label: FORBIDDEN_TOOLS_ABSENT_LABEL,
      explanation: `No forbidden tool was called (forbidden: ${forbidden.join(', ')}).`,
      metadata: { forbiddenTools: forbidden, actualTools: actual, usedForbiddenTools: used },
    };
  }

  return {
    score: 0,
    label: FORBIDDEN_TOOLS_USED_LABEL,
    explanation: `Forbidden tool called: ${used.join(', ')} (forbidden: ${forbidden.join(', ')}).`,
    metadata: { forbiddenTools: forbidden, actualTools: actual, usedForbiddenTools: used },
  };
};

export const createForensicTrajectoryEvaluator = (): Evaluator<
  ForensicDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls,
    goldenPathExtractor: (expected) => {
      const exp = expected as ForensicDatasetExample['output'] | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as ForensicDatasetExample['output'] | undefined;

      // A row declares either a golden path or a forbidden list; the guardrail wins when both are
      // set, because the forbidden list is the more specific statement about that row.
      const forbidden = exp?.forbidden_tool_sequence ?? [];
      if (forbidden.length > 0) {
        return evaluateForbiddenTools(forbidden, args.output);
      }

      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  } as Evaluator<ForensicDatasetExample, TaskOutput>;
};

export const wrapSkillInvocationForDistractors = (
  evaluator: Evaluator<ForensicDatasetExample, TaskOutput>
): Evaluator<ForensicDatasetExample, TaskOutput> => ({
  ...evaluator,
  evaluate: async (args) => {
    const result = await evaluator.evaluate(args);
    if (args.metadata?.row_type !== 'distractor') {
      return result;
    }

    if (
      result.score === null ||
      result.label === 'potentially_incomplete' ||
      result.label === 'error' ||
      result.label === 'unavailable' ||
      result.metadata?.incomplete === true
    ) {
      return result;
    }

    return {
      ...result,
      score: result.score === 1 ? 0 : 1,
      explanation: `${
        result.explanation ?? ''
      } Distractor example — inverted so skill-not-invoked scores 1.`.trim(),
    };
  },
});

export const buildForensicEvaluators = ({
  evaluators,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
}): Array<Evaluator<ForensicDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    createEndpointCriteriaEvaluator({ evaluators }) as Evaluator<
      ForensicDatasetExample,
      TaskOutput
    >,
    toolCalls as Evaluator<ForensicDatasetExample, TaskOutput>,
    latency as Evaluator<ForensicDatasetExample, TaskOutput>,
    inputTokens as Evaluator<ForensicDatasetExample, TaskOutput>,
    outputTokens as Evaluator<ForensicDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<ForensicDatasetExample, TaskOutput>,
    wrapSkillInvocationForDistractors(
      createSecuritySkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName: ENDPOINT_FORENSIC_ANALYSIS_SKILL_NAME,
      }) as Evaluator<ForensicDatasetExample, TaskOutput>
    ),
    createForensicTrajectoryEvaluator(),
  ];
};

export function createEvaluateForensicDataset({
  evaluators,
  executorClient,
  agentBuilderClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  agentBuilderClient: AgentBuilderClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateForensicDataset {
  return async function evaluateForensicDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: ForensicDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset<ForensicDatasetExample>;

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => converseQuestionToTaskOutput(agentBuilderClient, input.question),
      },
      buildForensicEvaluators({ evaluators, traceEsClient, log })
    );
  };
}
