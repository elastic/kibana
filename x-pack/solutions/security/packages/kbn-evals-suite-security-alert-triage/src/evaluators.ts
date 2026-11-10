/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type TaskOutput } from '@kbn/evals';
import { attachmentTools, internalTools } from '@kbn/agent-builder-common';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * CODE evaluator: scores whether the LLM called attachment_read the expected
 * number of times. Returns score=1 (pass) when the example metadata does not
 * set expectedAttachmentReads, so it can be included in eval suites that mix
 * inline-mode (no reads expected) and summary-mode (reads required) scenarios.
 */
export const attachmentReadCompliance = {
  name: 'AttachmentReadCompliance',
  kind: 'CODE' as const,
  direction: 'maximize' as const,
  evaluate: async ({ output, metadata }: { output: unknown; metadata: unknown }) => {
    const expectedReads = (metadata as { expectedAttachmentReads?: number } | undefined)
      ?.expectedAttachmentReads;
    const expected = typeof expectedReads === 'number' ? expectedReads : 0;

    if (!expected) {
      return { score: 1 };
    }

    const toolCalls = getToolCallSteps(output as TaskOutput);
    const readCalls = toolCalls.filter((t) => t.tool_id === attachmentTools.read);

    return {
      score: Math.min(1, readCalls.length / expected),
      metadata: { readCallCount: readCalls.length, expected },
    };
  },
};

const SECURITY_ALERTS_TOOL_ID = 'security.alerts';

const createToolCallCountEvaluator = (name: string, toolId: string) => ({
  name,
  kind: 'CODE' as const,
  direction: 'minimize' as const,
  evaluate: async ({ output }: { output: unknown }) => {
    const count = getToolCallSteps(output as TaskOutput).filter((t) => t.tool_id === toolId).length;
    return { score: count };
  },
});

/**
 * CODE evaluators for security-team#20696: count the calls that the alert-analysis skill
 * used to cause on literal-following models, and log the ordered tool sequence of each run.
 */
export const createToolUsageEvaluators = (log: ToolingLog) => [
  createToolCallCountEvaluator('security.alerts calls', SECURITY_ALERTS_TOOL_ID),
  createToolCallCountEvaluator('search_relevant_skills calls', internalTools.searchRelevantSkills),
  createToolCallCountEvaluator('load_skill calls', internalTools.loadSkill),
  {
    name: 'Tool sequence (steps)',
    kind: 'CODE' as const,
    direction: 'minimize' as const,
    evaluate: async ({ output }: { output: unknown }) => {
      const sequence = getToolCallSteps(output as TaskOutput).map((t) => t.tool_id ?? 'unknown');
      log.info(`Tool sequence (${sequence.length}): ${sequence.join(' > ')}`);
      return { score: sequence.length, metadata: { sequence } };
    },
  },
];
