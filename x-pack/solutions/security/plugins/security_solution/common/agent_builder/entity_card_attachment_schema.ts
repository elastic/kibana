/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const labelValueSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const riskInputItemSchema = z.object({
  title: z.string(),
  detail: z.string().max(8000).optional(),
  alert_count: z.number().optional(),
  /** Maps to the flyout risk summary table "Score" column when present */
  category_score: z.number().optional(),
});

const resolutionSchema = z.object({
  headline: z.string().max(2000).optional(),
  status: z.string().max(500).optional(),
  items: z.array(labelValueSchema).max(40).optional(),
});

const insightItemSchema = z.object({
  title: z.string(),
  body: z.string().max(8000).optional(),
  emphasis: z.enum(['info', 'warning', 'danger']).optional(),
});

/**
 * Payload for the `security.entity_card` Agent Builder attachment.
 * Populated from `security.get_entity` (and related) tool output — all sections are optional except identity.
 */
export const entityCardAttachmentDataSchema = z.object({
  attachmentLabel: z.string().optional(),
  entity_type: z.enum(['host', 'user', 'service', 'generic']),
  entity_id: z.string().min(1),
  entity_name: z.string().optional(),
  /** ECS-style document fragment; improves user.name resolution for deep links (same as entity explore row). */
  source: z.unknown().optional(),
  /** When true, shows the Entity Store source badge (same semantics as the flyout header). */
  is_entity_in_store: z.boolean().optional(),
  data_source: z.string().max(2000).optional(),
  watchlist_names: z.array(z.string()).max(50).optional(),
  criticality: z.string().max(128).optional(),
  field_rows: z.array(labelValueSchema).max(40).optional(),
  observed_rows: z.array(labelValueSchema).max(40).optional(),
  first_seen: z.string().max(200).optional(),
  last_activity: z.string().max(200).optional(),
  risk_score_norm: z.number().optional(),
  risk_level: z.string().max(64).optional(),
  /** ISO timestamp for the "Updated" line in the risk summary accordion (flyout parity). */
  risk_score_updated_at: z.string().max(200).optional(),
  risk_note: z.string().max(16000).optional(),
  risk_inputs: z.array(riskInputItemSchema).max(80).optional(),
  resolution: resolutionSchema.optional(),
  insights: z.array(insightItemSchema).max(40).optional(),
});

export type EntityCardAttachmentData = z.infer<typeof entityCardAttachmentDataSchema>;
