/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_HUNT_HISTORY_RESULTS } from './constants';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const HuntStatusEnum = z.enum(['running', 'complete', 'partial', 'error']);
export type HuntStatus = z.infer<typeof HuntStatusEnum>;

export const HuntSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type HuntSeverity = z.infer<typeof HuntSeverityEnum>;

// ---------------------------------------------------------------------------
// Result payload
//
// The structured payload needed to re-render the hunt canvas without calling
// the LLM again. `artifacts` / `activities` are stored opaquely (the client
// owns their shape) so the persistence layer never has to track canvas
// internals; a small typed summary is projected out for the list view.
// ---------------------------------------------------------------------------

export const huntResultPayloadSchema = z.object({
  /** Accumulated assistant narrative (markdown / labeled lines). */
  content: z.string().default(''),
  /** Structured evidence artifacts used to build the canvas presentation. */
  artifacts: z.array(z.record(z.string(), z.unknown())).default([]),
  /** Tool activity log surfaced under "Analysis details". */
  activities: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type HuntResultPayload = z.infer<typeof huntResultPayloadSchema>;

export const huntSummarySchema = z.object({
  /** Short verdict/title shown in the list. */
  verdict: z.string().default(''),
  severity: HuntSeverityEnum.optional(),
  confidence: z.number().min(0).max(100).optional(),
  findingCount: z.number().int().min(0).default(0),
  entityCount: z.number().int().min(0).default(0),
  alertCount: z.number().int().min(0).default(0),
});

export type HuntSummary = z.infer<typeof huntSummarySchema>;

// ---------------------------------------------------------------------------
// Record
// ---------------------------------------------------------------------------

export const huntRecordSchema = z.object({
  id: z.string(),
  space: z.string(),
  /** Readable analyst intent shown in the transcript and history. */
  question: z.string(),
  /** Fully scoped prompt sent to the agent (optional; used to rerun). */
  scopedPrompt: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Username of the analyst who ran the hunt (server-derived). */
  createdBy: z.string(),
  /** Optional analyst-assigned name. */
  name: z.string().optional(),
  pinned: z.boolean().default(false),
  status: HuntStatusEnum.default('complete'),
  summary: huntSummarySchema,
  result: huntResultPayloadSchema,
});

export type HuntRecord = z.infer<typeof huntRecordSchema>;

/** Lightweight projection returned by the list endpoint (no heavy payload). */
export const huntListItemSchema = huntRecordSchema.omit({ result: true, space: true });

export type HuntListItem = z.infer<typeof huntListItemSchema>;

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const createHuntRequestSchema = z.object({
  question: z.string().min(1),
  scopedPrompt: z.string().optional(),
  name: z.string().optional(),
  status: HuntStatusEnum.optional(),
  summary: huntSummarySchema,
  result: huntResultPayloadSchema,
});

export type CreateHuntRequest = z.infer<typeof createHuntRequestSchema>;

export const createHuntResponseSchema = z.object({
  id: z.string(),
});

export type CreateHuntResponse = z.infer<typeof createHuntResponseSchema>;

export const listHuntsRequestSchema = z.object({
  size: z.coerce.number().int().min(1).max(MAX_HUNT_HISTORY_RESULTS).optional(),
});

export type ListHuntsRequest = z.infer<typeof listHuntsRequestSchema>;

export const listHuntsResponseSchema = z.object({
  hunts: z.array(huntListItemSchema),
  total: z.number(),
});

export type ListHuntsResponse = z.infer<typeof listHuntsResponseSchema>;

export const getHuntParamsSchema = z.object({
  id: z.string().min(1),
});

export type GetHuntParams = z.infer<typeof getHuntParamsSchema>;

export const getHuntResponseSchema = huntRecordSchema.omit({ space: true });

export type GetHuntResponse = z.infer<typeof getHuntResponseSchema>;

export const patchHuntParamsSchema = z.object({
  id: z.string().min(1),
});

export type PatchHuntParams = z.infer<typeof patchHuntParamsSchema>;

/** Rename and/or pin/unpin. At least one field must be provided. */
export const patchHuntRequestSchema = z
  .object({
    name: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.pinned !== undefined, {
    message: 'At least one of "name" or "pinned" must be provided.',
  });

export type PatchHuntRequest = z.infer<typeof patchHuntRequestSchema>;

export const deleteHuntParamsSchema = z.object({
  id: z.string().min(1),
});

export type DeleteHuntParams = z.infer<typeof deleteHuntParamsSchema>;
