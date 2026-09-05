/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_LEADS_PER_RUN } from './constants';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LeadStatusEnum = z.enum(['active', 'dismissed', 'expired']);
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const LeadStalenessEnum = z.enum(['fresh', 'stale', 'expired']);
export type LeadStaleness = z.infer<typeof LeadStalenessEnum>;

export const LeadSourceTypeEnum = z.enum(['adhoc', 'scheduled']);
export type LeadSourceType = z.infer<typeof LeadSourceTypeEnum>;

/** Whether a lead qualified from its own observations ('observations') or was
 *  surfaced by the exploratory-lead LLM promotion call ('exploratory'). */
export const LeadOriginEnum = z.enum(['observations', 'exploratory']);
export type LeadOrigin = z.infer<typeof LeadOriginEnum>;

export const ObservationSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type ObservationSeverity = z.infer<typeof ObservationSeverityEnum>;

// ---------------------------------------------------------------------------
// Observation
// ---------------------------------------------------------------------------

export const observationSchema = z.object({
  entityId: z.string(),
  moduleId: z.string(),
  type: z.string(),
  score: z.number().min(0).max(100),
  severity: ObservationSeverityEnum,
  confidence: z.number().min(0).max(1),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type Observation = z.infer<typeof observationSchema>;

// ---------------------------------------------------------------------------
// Lead entity – minimal entity reference stored inside a lead
// ---------------------------------------------------------------------------

export const leadEntitySchema = z.object({
  type: z.string(),
  name: z.string(),
  // Entity Store unique identifier (EUID, e.g. `"host:8c67cb16-..."`)
  id: z.string(),
});

export type LeadEntity = z.infer<typeof leadEntitySchema>;

export const relatedEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  kinds: z.array(z.string()),
  riskLevel: z.string().optional(),
  criticality: z.string().optional(),
  interactedWithAtLeast: z.number().optional(),
});
export type RelatedEntity = z.infer<typeof relatedEntitySchema>;

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export const leadSchema = z.object({
  id: z.string(),
  title: z.string(),
  byline: z.string(),
  description: z.string(),
  entity: leadEntitySchema,
  tags: z.array(z.string()),
  priority: z.number().min(1).max(10),
  chatRecommendations: z.array(z.string()),
  /**
   * ISO-8601 timestamp of the last generation run that produced or re-observed this lead.
   * Updated on every run regardless of whether new observations were added.
   * Distinct from `createdAt` (first insert) and `changedAt` (lead content or status changed).
   */
  timestamp: z.string().datetime(),
  staleness: LeadStalenessEnum,
  status: LeadStatusEnum.default('active'),
  observations: z.array(observationSchema),
  topRelatedEntities: z.array(relatedEntitySchema).default([]),
  // there is a cap of how many related entities are kept per kind, this is the count of the total number of related entities per kind
  relatedEntityCounts: z.record(z.string(), z.number()).default({}),
  executionUuid: z.string().uuid(),
  sourceType: LeadSourceTypeEnum,
  origin: LeadOriginEnum.default('observations'),
  createdAt: z.string(),
  /**
   * When lead content or status last changed (create, evidence update, dismiss).
   * Not `updatedAt`: a last-seen refresh still writes the document (stamps `timestamp`)
   * but leaves this field unchanged so the change feed only emits material changes.
   */
  changedAt: z.string(),
  version: z.number().int().min(1),
});

export type Lead = z.infer<typeof leadSchema>;

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

export const leadGenerationEngineConfigSchema = z.object({
  minObservations: z.number().int().min(0).default(1),
  maxLeads: z.number().int().min(1).default(MAX_LEADS_PER_RUN),
  corroborationBonus: z.number().min(0).max(1).default(0.15),
  diversityBonus: z.number().min(0).max(1).default(0.1),
  normalizationCeiling: z.number().min(1).default(100),
});

export type LeadGenerationEngineConfig = z.infer<typeof leadGenerationEngineConfigSchema>;

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const generateLeadsRequestSchema = z.object({
  maxLeads: z.number().int().min(1).max(50).optional(),
  connectorId: z.string().min(1),
});

export type GenerateLeadsRequest = z.infer<typeof generateLeadsRequestSchema>;

export const generateLeadsResponseSchema = z.object({
  executionUuid: z.string().uuid(),
});

export type GenerateLeadsResponse = z.infer<typeof generateLeadsResponseSchema>;

export const findLeadsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortField: z.enum(['priority', 'timestamp']).optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: LeadStatusEnum.optional(),
});

export type FindLeadsRequest = z.infer<typeof findLeadsRequestSchema>;

export const leadChangesRequestSchema = z.object({
  cursor: z.string().max(2048).optional(),
  perPage: z.coerce.number().int().min(1).max(1000).optional().default(100),
});
export type LeadChangesRequest = z.infer<typeof leadChangesRequestSchema>;

export const leadChangesResponseSchema = z.object({
  changed: z.array(leadSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type LeadChangesResponse = z.infer<typeof leadChangesResponseSchema>;

export const findLeadsResponseSchema = z.object({
  leads: z.array(leadSchema),
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
});

export type FindLeadsResponse = z.infer<typeof findLeadsResponseSchema>;

export const dismissLeadRequestSchema = z.object({
  id: z.string().min(1),
});

export type DismissLeadRequest = z.infer<typeof dismissLeadRequestSchema>;

export const bulkUpdateLeadsRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: LeadStatusEnum,
});

export type BulkUpdateLeadsRequest = z.infer<typeof bulkUpdateLeadsRequestSchema>;

export const bulkUpdateLeadsResponseSchema = z.object({
  updated: z.number(),
});

export type BulkUpdateLeadsResponse = z.infer<typeof bulkUpdateLeadsResponseSchema>;

export const enableLeadGenerationRequestSchema = z.object({
  connectorId: z.string().min(1),
});

export type EnableLeadGenerationRequest = z.infer<typeof enableLeadGenerationRequestSchema>;

export const leadGenerationStatusSchema = z.object({
  isEnabled: z.boolean(),
  indexExists: z.boolean(),
  totalLeads: z.number(),
  lastRun: z.string().datetime().nullable(),
  connectorId: z.string().optional(),
  lastExecutionUuid: z.string().optional(),
  lastError: z.string().nullable().optional(),
});

export type LeadGenerationStatus = z.infer<typeof leadGenerationStatusSchema>;
