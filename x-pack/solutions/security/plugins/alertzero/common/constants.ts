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

/**
 * Single source of truth for the Hunt Watch attachment type ids, used by the server
 * attachment definitions, the client attachment UI definitions, and their tests.
 */
export const ALERTZERO_ATTACHMENT_TYPES = {
  threat: 'security.threat',
} as const;

// --- Hunt services (PR 3: hunt-watch-services-lift) ---

/** Internal route namespace for the hunt services PR 4's Worker calls through `kibana.request`. */
export const HUNT_INTERNAL_ROUTE_BASE = '/internal/alertzero/hunt' as const;

/** Reports index the hunt services read candidates from and write feedback to. */
export const HUNT_REPORTS_INDEX = '.kibana-threat-reports' as const;

/** Investigation conversation id namespace: the id is `uuidv5(${HUNT_INVESTIGATION_ID_NAMESPACE}${reportId})` within the originating space. */
export const HUNT_INVESTIGATION_ID_NAMESPACE = 'hunt:report:' as const;

/** Collapsed hunt-once status written to `feedback.last_hunt_status`: `environment_hits_found` maps to `hit`; both clean statuses collapse to `clean`. A blocked scope writes neither. */
export const HUNT_STATUS_HIT = 'hit' as const;
export const HUNT_STATUS_CLEAN = 'clean' as const;

/** All valid collapsed hunt statuses, for schema validation. */
export const HUNT_STATUSES = [HUNT_STATUS_HIT, HUNT_STATUS_CLEAN] as const;

/** Tier 1 hunts scope by IOC lookup against a small, fixed index set. */
export const HUNT_TIER_1 = 'tier1' as const;

/** Tier 2 hunts scope by TTP/behavior search against a broader index set. */
export const HUNT_TIER_2 = 'tier2' as const;

/** All valid hunt tier values, for schema validation. */
export const HUNT_TIERS = [HUNT_TIER_1, HUNT_TIER_2] as const;

/**
 * Space-derived alerts index pattern every hunt's index scope includes
 * alongside its technology-specific patterns: `.alerts-security.alerts-{spaceId}`
 * (buildout.md:175). Build with `` `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${spaceId}` ``.
 */
export const HUNT_ALERTS_INDEX_PATTERN_PREFIX = '.alerts-security.alerts-' as const;

/**
 * Single source of truth for the Hunt Watch attachment type ids, used by the server
 * attachment definitions, the client attachment UI definitions, and their tests.
 * PR 1 (hunt-watch-attachment-types) defines these; mirrored here until that branch merges.
 */
export const ALERTZERO_ATTACHMENT_TYPE_HUNT_CORRELATION = 'security.hunt_correlation' as const;

/**
 * Global-catalog space sentinel on `.kibana-threat-reports` (buildout.md:150:
 * "global catalog rows use `space_id: '*'`"). Reads filter to `{terms: {
 * space_id: [currentSpaceId, HUNT_GLOBAL_SPACE_ID] }}`; F4's feedback write is
 * always space-scoped to the caller's concrete space, never this sentinel.
 */
export const HUNT_GLOBAL_SPACE_ID = '*' as const;
