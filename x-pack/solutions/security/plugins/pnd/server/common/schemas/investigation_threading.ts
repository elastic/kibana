/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Investigation threading contract (issue #18730).
//
// Defines the canonical shape for the conversation thread that links all
// Worker runs under a single Investigation. Every Watch tier that emits a
// Proposal or EvidencePackage MUST carry the threadId so the Throughline UI
// can reconstruct the full investigation narrative across tiers.
//
// This contract closes the gap identified in #18730: "Unclear what the
// contract is between watches. How we should expect data to be shared
// across watches." The threadId is the join key — it is stable across
// Floor -> Dark -> Deep -> Detection handoffs and survives re-triggering.

import { z } from '@kbn/zod/v4';
import { watchEscalationTierSchema } from './watch_escalation';

/**
 * Canonical investigation thread identifier. Carried unchanged across all
 * Watch tier handoffs and persisted on every Proposal and EvidencePackage.
 */
export const investigationThreadIdSchema = z.object({
  /** The investigation this thread belongs to. */
  investigationId: z.string().min(1),
  /** The Watch tier that originated this thread. */
  sourceWatch: watchEscalationTierSchema,
  /** ISO timestamp of thread creation. */
  createdAt: z.string().min(1),
  /** Optional parent thread reference (for re-triggered or forked investigations). */
  parentThreadRef: z.string().optional(),
});
export type InvestigationThreadId = z.infer<typeof investigationThreadIdSchema>;

/**
 * Validate that a thread id is well-formed. Throws on missing required fields.
 */
export const validateInvestigationThreadId = (input: unknown): InvestigationThreadId => {
  return investigationThreadIdSchema.parse(input);
};
