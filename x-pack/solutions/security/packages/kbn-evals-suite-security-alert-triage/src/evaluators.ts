/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolCallSteps, type TaskOutput } from '@kbn/evals';
import { attachmentTools } from '@kbn/agent-builder-common';

/**
 * CODE evaluator: scores whether the LLM called attachment_read the expected
 * number of times. Returns score=1 (pass) when the example metadata does not
 * set expectedAttachmentReads, so it can be included in eval suites that mix
 * inline-mode (no reads expected) and summary-mode (reads required) scenarios.
 */
export const attachmentReadCompliance = {
  name: 'AttachmentReadCompliance',
  kind: 'CODE' as const,
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
