/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upper bound on how many recent leads are fetched and surfaced anywhere in
 * the UI (main panel count, "See recent leads" label, and the flyout list).
 * See `MAX_RECENT_LEADS` in the common lead generation constants for how this
 * is derived from the per-run engine cap.
 */
export { MAX_RECENT_LEADS } from '../../../../../common/entity_analytics/lead_generation/constants';

/**
 * Scope/context id used when opening an entity flyout from a hunting lead
 * badge, so the flyout's own state doesn't collide with other entity flyout
 * consumers on the page (e.g. the entities table).
 */
export const THREAT_HUNTING_LEADS_SCOPE_ID = 'entity-analytics-threat-hunting-leads';

export const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'storage';
    case 'service':
      return 'node';
    case 'generic':
    default:
      return 'globe';
  }
};
