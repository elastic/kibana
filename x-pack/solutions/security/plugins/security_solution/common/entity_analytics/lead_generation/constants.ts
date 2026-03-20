/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LEAD_GENERATION_URL = '/internal/entity_analytics/leads' as const;
export const GENERATE_LEADS_URL = `${LEAD_GENERATION_URL}/generate` as const;
export const LEAD_GENERATION_STATUS_URL = `${LEAD_GENERATION_URL}/status` as const;

export type LeadGenerationMode = 'adhoc' | 'scheduled';

export const getLeadsIndexName = (spaceId: string, mode: LeadGenerationMode = 'adhoc'): string =>
  `.internal.${mode}.entity-analytics.entity-leads.entity-${spaceId}`;
