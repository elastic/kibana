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
  ALERTZERO_INVESTIGATIONS_URL,
  ALERTZERO_INVESTIGATION_URL_TEMPLATE,
  ALERTZERO_THIN_AGENT_ID,
  ALERTZERO_WATCHES_URL,
  ALERTZERO_WATCH_URL_TEMPLATE,
  buildInvestigationUrl,
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

/** API privilege to create or link incidents. Granted by `alertzero:all` and the `manage_incidents` sub-feature. */
export const ALERTZERO_API_PRIVILEGE_MANAGE_INCIDENTS = 'manage_incidents' as const;

/** UI capability paired with {@link ALERTZERO_API_PRIVILEGE_MANAGE_INCIDENTS}. */
export const ALERTZERO_UI_CAPABILITY_MANAGE_INCIDENTS = 'manageIncidents' as const;

/** Owner id registered for all AlertZero managed workflow definitions. */
export const ALERTZERO_MANAGED_WORKFLOW_OWNER_ID = 'alertzero' as const;
