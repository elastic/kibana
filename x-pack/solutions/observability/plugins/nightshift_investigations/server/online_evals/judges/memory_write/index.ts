/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { lazySchema, z } from '@kbn/zod/v4';

export const WRITE_JUDGE_EVALUATOR_NAME = 'nightshift_memory_write_judge';
export const MEMORY_WRITE_JUDGE_VERSION = '1.0.0';

const appliedWriteRecordSchema = lazySchema(() =>
  z.object({
    store: z.string(),
    item_id: z.string(),
    action: z.string(),
    version: z.number().optional(),
    before_content: z.string().optional(),
    after_content: z.string().optional(),
    source_memory_ids: z.array(z.string()).optional(),
  })
);

export const memoryWriteJudgeReferenceDataSchema = lazySchema(() =>
  z.object({
    applied_writes: z.array(appliedWriteRecordSchema).optional(),
  })
);

export type MemoryWriteJudgeReferenceData = z.infer<typeof memoryWriteJudgeReferenceDataSchema>;

/**
 * Scores applied memory writes from a Nightshift investigation round, emitting one aggregated
 * score per store so customer-derived item slugs never appear in outbound score names and the
 * score count stays bounded by the number of stores.
 */
export const memoryWriteJudge: RegisteredEvaluatorDefinition<MemoryWriteJudgeReferenceData> = {
  name: WRITE_JUDGE_EVALUATOR_NAME,
  version: MEMORY_WRITE_JUDGE_VERSION,
  kind: 'code',
  direction: 'maximize',
  description:
    'Evaluates applied memory writes (Cortex, Semantic Memory, Decision Trees and Learnings) from a Nightshift investigation round.',
  referenceDataSchema: memoryWriteJudgeReferenceDataSchema,
  async evaluate({ referenceData }) {
    const appliedWrites = referenceData?.applied_writes ?? [];
    const writesByStore = new Map<string, typeof appliedWrites>();
    for (const write of appliedWrites) {
      const group = writesByStore.get(write.store) ?? [];
      group.push(write);
      writesByStore.set(write.store, group);
    }

    return {
      scores: [...writesByStore.entries()].map(([store, writes]) => {
        const groundedCount = writes.filter(
          (write) =>
            write.action.startsWith('archive') ||
            Boolean(write.after_content && write.after_content.trim().length > 0)
        ).length;
        return {
          name: 'memory_write_quality',
          score: Number((groundedCount / writes.length).toFixed(4)),
          label: `${store}:${groundedCount}/${writes.length}`,
          explanation: `${groundedCount} of ${writes.length} ${store} writes had content.`,
        };
      }),
    };
  },
};
