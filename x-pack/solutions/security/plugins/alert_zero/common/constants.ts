/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERT_ZERO_APP_ID,
  ALERT_ZERO_APP_PATH,
  ALERT_ZERO_FEATURE_ID,
  ALERT_ZERO_INTERNAL_URL,
  ALERT_ZERO_PLUGIN_NAME,
  ALERT_ZERO_INVESTIGATIONS_URL,
  ALERT_ZERO_INVESTIGATION_URL_TEMPLATE,
  ALERTZERO_THIN_AGENT_ID,
  ALERT_ZERO_WATCHES_URL,
  ALERT_ZERO_WATCH_URL_TEMPLATE,
  buildInvestigationUrl,
  buildWatchUrl,
  SYSTEM_SECURITY_WATCH_IDS,
} from '@kbn/alert-zero-common';

/** API privilege for read-only Alert Zero internal routes. */
export const ALERT_ZERO_API_PRIVILEGE_READ = 'alertzero_read' as const;

/**
 * API privilege for Alert Zero internal routes that mutate state. Only granted by the `all` feature
 * privilege. This route-level check is the authorization boundary for managed settings installs.
 */
export const ALERT_ZERO_API_PRIVILEGE_WRITE = 'alertzero_write' as const;

/** Owner id registered for all Alert Zero managed workflow definitions. */
export const ALERT_ZERO_MANAGED_WORKFLOW_OWNER_ID = 'alertzero' as const;
