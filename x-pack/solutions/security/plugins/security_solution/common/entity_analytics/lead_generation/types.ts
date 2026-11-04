/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LeadStatusEnum = lazySchema(() => z.enum(['active', 'dismissed', 'expired']));
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const LeadStalenessEnum = lazySchema(() => z.enum(['fresh', 'stale', 'expired']));
export type LeadStaleness = z.infer<typeof LeadStalenessEnum>;

export const LeadSourceTypeEnum = lazySchema(() => z.enum(['adhoc', 'scheduled']));
export type LeadSourceType = z.infer<typeof LeadSourceTypeEnum>;

export const ObservationSeverityEnum = lazySchema(() =>
  z.enum(['low', 'medium', 'high', 'critical'])
);
export type ObservationSeverity = z.infer<typeof ObservationSeverityEnum>;

// ---------------------------------------------------------------------------
// Observation
// ---------------------------------------------------------------------------

export const observationSchema = lazySchema(() =>
  z.object({
    entityId: z.string(),
    moduleId: z.string(),
    type: z.string(),
    score: z.number().min(0).max(100),
    severity: ObservationSeverityEnum,
    confidence: z.number().min(0).max(1),
    description: z.string(),
    metadata: z.record(z.string(), z.unknown()),
  })
);

export type Observation = z.infer<typeof observationSchema>;

// ---------------------------------------------------------------------------
// Lead entity – minimal entity reference stored inside a lead
// ---------------------------------------------------------------------------

export const leadEntitySchema = lazySchema(() =>
  z.object({
    type: z.string(),
    name: z.string(),
  })
);

export type LeadEntity = z.infer<typeof leadEntitySchema>;

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export const leadSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    byline: z.string(),
    description: z.string(),
    entities: z.array(leadEntitySchema),
    tags: z.array(z.string()),
    priority: z.number().min(1).max(10),
    chatRecommendations: z.array(z.string()),
    timestamp: z.string().datetime(),
    staleness: LeadStalenessEnum,
    status: LeadStatusEnum.default('active'),
    observations: z.array(observationSchema),
    executionUuid: z.string().uuid(),
    sourceType: LeadSourceTypeEnum,
  })
);

export type Lead = z.infer<typeof leadSchema>;

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

export const leadGenerationEngineConfigSchema = lazySchema(() =>
  z.object({
    minObservations: z.number().int().min(0).default(1),
    maxLeads: z.number().int().min(1).default(10),
    corroborationBonus: z.number().min(0).max(1).default(0.15),
    diversityBonus: z.number().min(0).max(1).default(0.1),
    normalizationCeiling: z.number().min(1).default(100),
  })
);

export type LeadGenerationEngineConfig = z.infer<typeof leadGenerationEngineConfigSchema>;

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const generateLeadsRequestSchema = lazySchema(() =>
  z.object({
    maxLeads: z.number().int().min(1).max(50).optional(),
    connectorId: z.string().min(1),
  })
);

export type GenerateLeadsRequest = z.infer<typeof generateLeadsRequestSchema>;

export const generateLeadsResponseSchema = lazySchema(() =>
  z.object({
    executionUuid: z.string().uuid(),
  })
);

export type GenerateLeadsResponse = z.infer<typeof generateLeadsResponseSchema>;

export const findLeadsRequestSchema = lazySchema(() =>
  z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
    sortField: z.enum(['priority', 'timestamp']).optional().default('priority'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    status: LeadStatusEnum.optional(),
  })
);

export type FindLeadsRequest = z.infer<typeof findLeadsRequestSchema>;

export const findLeadsResponseSchema = lazySchema(() =>
  z.object({
    leads: z.array(leadSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
  })
);

export type FindLeadsResponse = z.infer<typeof findLeadsResponseSchema>;

export const dismissLeadRequestSchema = lazySchema(() =>
  z.object({
    id: z.string().min(1),
  })
);

export type DismissLeadRequest = z.infer<typeof dismissLeadRequestSchema>;

export const bulkUpdateLeadsRequestSchema = lazySchema(() =>
  z.object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    status: LeadStatusEnum,
  })
);

export type BulkUpdateLeadsRequest = z.infer<typeof bulkUpdateLeadsRequestSchema>;

export const bulkUpdateLeadsResponseSchema = lazySchema(() =>
  z.object({
    updated: z.number(),
  })
);

export type BulkUpdateLeadsResponse = z.infer<typeof bulkUpdateLeadsResponseSchema>;

export const enableLeadGenerationRequestSchema = lazySchema(() =>
  z.object({
    connectorId: z.string().min(1),
  })
);

export type EnableLeadGenerationRequest = z.infer<typeof enableLeadGenerationRequestSchema>;

export const leadGenerationStatusSchema = lazySchema(() =>
  z.object({
    isEnabled: z.boolean(),
    indexExists: z.boolean(),
    totalLeads: z.number(),
    lastRun: z.string().datetime().nullable(),
    connectorId: z.string().optional(),
    lastExecutionUuid: z.string().optional(),
    lastError: z.string().nullable().optional(),
  })
);

export type LeadGenerationStatus = z.infer<typeof leadGenerationStatusSchema>;
