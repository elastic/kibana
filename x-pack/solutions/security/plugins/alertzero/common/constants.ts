/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_INTERNAL_URL,
  ALERTZERO_PLUGIN_NAME,
  ALERTZERO_THIN_AGENT_ID,
  ALERTZERO_WATCHES_URL,
  ALERTZERO_WATCH_URL_TEMPLATE,
  buildWatchUrl,
  SYSTEM_SECURITY_WATCH_IDS,
} from '@kbn/alertzero-common';

/** API privilege for read-only AlertZero internal routes. */
export const ALERTZERO_API_PRIVILEGE_READ = 'alertzero_read' as const;

/**
 * API privilege for AlertZero internal routes that mutate state. Only granted by the `all` feature
 * privilege. This route-level check is the authorization boundary for managed settings installs.
 */
export const ALERTZERO_API_PRIVILEGE_WRITE = 'alertzero_write' as const;

/** Owner id registered for all AlertZero managed workflow definitions. */
export const ALERTZERO_MANAGED_WORKFLOW_OWNER_ID = 'alertzero' as const;

// --- Hunt services (PR 3: hunt-watch-services-lift) ---

/** Run status while a hunt is actively querying source indices. */
export const HUNT_RUN_STATUS_RUNNING = 'running' as const;

/** Run status once a hunt completes with zero or more environment hits. */
export const HUNT_RUN_STATUS_COMPLETE = 'complete' as const;

/** Run status when a hunt run fails before producing a result. */
export const HUNT_RUN_STATUS_FAILED = 'failed' as const;

/** All valid hunt run status values, for schema validation. */
export const HUNT_RUN_STATUSES = [
  HUNT_RUN_STATUS_RUNNING,
  HUNT_RUN_STATUS_COMPLETE,
  HUNT_RUN_STATUS_FAILED,
] as const;

/** Tier 1 hunts scope by IOC lookup against a small, fixed index set. */
export const HUNT_TIER_1 = 'tier1' as const;

/** Tier 2 hunts scope by TTP/behavior search against a broader index set. */
export const HUNT_TIER_2 = 'tier2' as const;

/** All valid hunt tier values, for schema validation. */
export const HUNT_TIERS = [HUNT_TIER_1, HUNT_TIER_2] as const;
