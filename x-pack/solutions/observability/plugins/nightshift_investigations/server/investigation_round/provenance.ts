/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export interface WriteProvenance {
  conversationId?: string;
  roundId?: string;
  workflowExecutionId?: string;
}

export const APPLIED_WRITE_STORES = [
  'cortex',
  'semantic_memory',
  'decision_tree',
  'decision_tree_learning',
] as const;

export type AppliedWriteStore = (typeof APPLIED_WRITE_STORES)[number];

export interface AppliedWriteRecord {
  store: AppliedWriteStore;
  item_id: string;
  action: string;
  version?: string | number;
  before_status?: string;
  after_status?: string;
  before_content?: string;
  after_content?: string;
  replaced_ids?: string[];
}

export const appliedWriteSchema = z.object({
  store: z.enum(APPLIED_WRITE_STORES),
  item_id: z.string(),
  action: z.string(),
  version: z.union([z.string(), z.number()]).optional(),
  before_status: z.string().optional(),
  after_status: z.string().optional(),
  before_content: z.string().optional(),
  after_content: z.string().optional(),
  replaced_ids: z.array(z.string()).optional(),
});
