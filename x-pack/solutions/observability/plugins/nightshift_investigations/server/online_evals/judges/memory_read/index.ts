/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { lazySchema, z } from '@kbn/zod/v4';

export const READ_JUDGE_EVALUATOR_NAME = 'nightshift_memory_read_judge';
export const MEMORY_READ_JUDGE_VERSION = '1.0.0';

export const memoryReadJudgeReferenceDataSchema = lazySchema(() =>
  z.object({
    recalled_ids: z.array(z.string()).optional(),
    opened_ids: z.array(z.string()).optional(),
  })
);

export type MemoryReadJudgeReferenceData = z.infer<typeof memoryReadJudgeReferenceDataSchema>;

/**
 * Scores whether recalled or hydrated items (Cortex pages, Semantic Memories, Decision Trees)
 * were opened during a Nightshift investigation round.
 */
export const memoryReadJudge: RegisteredEvaluatorDefinition<MemoryReadJudgeReferenceData> = {
  name: READ_JUDGE_EVALUATOR_NAME,
  version: MEMORY_READ_JUDGE_VERSION,
  kind: 'code',
  direction: 'maximize',
  description:
    'Evaluates whether recalled or hydrated memory items (Cortex, Semantic Memory, Decision Trees) were opened during a Nightshift investigation round.',
  referenceDataSchema: memoryReadJudgeReferenceDataSchema,
  async evaluate({ referenceData }) {
    const recalledIds = referenceData?.recalled_ids ?? [];
    const openedIds = referenceData?.opened_ids ?? [];
    if (recalledIds.length === 0 && openedIds.length === 0) {
      return { scores: [] };
    }

    const recalledSet = new Set(recalledIds);
    const openedRecalled = openedIds.filter((id) => recalledSet.has(id));
    const precision = recalledIds.length > 0 ? openedRecalled.length / recalledIds.length : 0;
    const openedAny = openedRecalled.length > 0;

    return {
      scores: [
        {
          name: 'memory_read_utility',
          score: Number(precision.toFixed(4)),
          label: openedAny ? 'RECALLED_OPENED' : 'RECALLED_NOT_OPENED',
          explanation: `Agent opened ${openedRecalled.length} of ${recalledIds.length} recalled/hydrated items.`,
        },
      ],
    };
  },
};
