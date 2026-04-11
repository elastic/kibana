/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LeadStatusEnum = z.enum(['active', 'dismissed', 'expired']);
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const LeadStalenessEnum = z.enum(['fresh', 'stale', 'expired']);
export type LeadStaleness = z.infer<typeof LeadStalenessEnum>;

export const LeadSourceTypeEnum = z.enum(['adhoc', 'scheduled']);
export type LeadSourceType = z.infer<typeof LeadSourceTypeEnum>;

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
});

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export const leadSchema = z.object({
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
});

export type Lead = z.infer<typeof leadSchema>;

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const generateLeadsRequestSchema = z.object({
  maxLeads: z.number().int().min(1).max(50).optional(),
});

export const findLeadsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortField: z.enum(['priority', 'timestamp']).optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: LeadStatusEnum.optional(),
});

export const getLeadByIdRequestSchema = z.object({
  id: z.string().min(1),
});

export const dismissLeadRequestSchema = z.object({
  id: z.string().min(1),
});

export const bulkUpdateLeadsRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: LeadStatusEnum,
});
