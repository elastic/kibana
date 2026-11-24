/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { lazySchema, z } from '@kbn/zod/v4';
import { batchEntrySchema } from './detection_batch';

export const MAX_BATCH_ENTRIES = 1_000;

export const resolveWrittenDetectionsInputSchema = lazySchema(() =>
  z.object({
    workflow_execution_id: z.string().max(MAX_ID_LENGTH),
    batch: z.array(batchEntrySchema).max(MAX_BATCH_ENTRIES),
    reported_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_BATCH_ENTRIES),
  })
);

export const resolveWrittenDetectionsOutputSchema = lazySchema(() =>
  z.object({
    stamp_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_BATCH_ENTRIES),
    derived_count: z.number().int().min(0).max(MAX_BATCH_ENTRIES),
    unknown_reported_count: z.number().int().min(0).max(MAX_BATCH_ENTRIES),
  })
);
