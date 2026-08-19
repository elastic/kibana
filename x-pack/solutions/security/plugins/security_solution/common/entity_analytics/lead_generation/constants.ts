/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LEAD_GENERATION_URL = '/internal/entity_analytics/leads' as const;
export const GENERATE_LEADS_URL = `${LEAD_GENERATION_URL}/generate` as const;
export const GET_LEADS_URL = LEAD_GENERATION_URL as string;
export const LEAD_GENERATION_STATUS_URL = `${LEAD_GENERATION_URL}/status` as const;
export const DISMISS_LEAD_URL = `${LEAD_GENERATION_URL}/{id}/_dismiss` as const;
export const BULK_UPDATE_LEADS_URL = `${LEAD_GENERATION_URL}/bulk_update` as const;
export const ENABLE_LEAD_GENERATION_URL = `${LEAD_GENERATION_URL}/enable` as const;
export const DISABLE_LEAD_GENERATION_URL = `${LEAD_GENERATION_URL}/disable` as const;
export const LEAD_GENERATION_PRIVILEGES_URL = `${LEAD_GENERATION_URL}/privileges` as const;

const LEADS_INDEX_PREFIX = '.entity_analytics.entity-leads' as const;

export const LEADS_INDEX_PATTERN = `${LEADS_INDEX_PREFIX}-*` as const;

export const LEAD_SOURCE_TYPES = ['adhoc', 'scheduled'] as const;

export type LeadGenerationMode = (typeof LEAD_SOURCE_TYPES)[number];

export const getLeadsIndexName = (spaceId: string, mode: LeadGenerationMode = 'adhoc'): string =>
  `${LEADS_INDEX_PREFIX}-${mode}.entity-${spaceId}`;

/** Max leads produced by a single generation run (engine cap; see `DEFAULT_ENGINE_CONFIG.maxLeads`). */
export const MAX_LEADS_PER_RUN = 10;

/**
 * Upper bound on recent leads that can exist at once (and thus be fetched/shown
 * anywhere in the UI — main panel count, "See recent leads" label, and the
 * flyout list). Persistence replaces prior leads per source type via a
 * `deleteByQuery` keyed on the new `execution_uuid`, so at most
 * `MAX_LEADS_PER_RUN` leads survive per source type at a time.
 */
export const MAX_RECENT_LEADS = MAX_LEADS_PER_RUN * LEAD_SOURCE_TYPES.length;
