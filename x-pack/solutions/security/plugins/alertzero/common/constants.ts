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
 * privilege. Settings writes (autonomy, schedule, extras) are authorized by this privilege alone.
 * Enable/disable also requires Workflows `update` and `managed:update` (see the worker PATCH route).
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

// --- Hunt services ---

/** Internal route namespace for the hunt services. */
export const HUNT_INTERNAL_ROUTE_BASE = '/internal/alertzero/hunt' as const;

/** Reports index the hunt services read candidates from and write feedback to. */
export const HUNT_REPORTS_INDEX = '.kibana-threat-reports' as const;

/** Investigation conversation id namespace: the id is `uuidv5(${HUNT_INVESTIGATION_ID_NAMESPACE}${reportId})` within the originating space. */
export const HUNT_INVESTIGATION_ID_NAMESPACE = 'hunt:report:' as const;

/**
 * Space-derived alerts index pattern every hunt's index scope includes
 * alongside its technology-specific patterns: `.alerts-security.alerts-{spaceId}`.
 * Build with `` `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${spaceId}` ``.
 */
export const HUNT_ALERTS_INDEX_PATTERN_PREFIX = '.alerts-security.alerts-' as const;

/**
 * Global-catalog space sentinel on `.kibana-threat-reports`. Reads filter to
 * `{terms: { space_id: [currentSpaceId, HUNT_GLOBAL_SPACE_ID] }}`; feedback
 * writes are always space-scoped to the caller's concrete space, never this sentinel.
 */
export const HUNT_GLOBAL_SPACE_ID = '*' as const;
