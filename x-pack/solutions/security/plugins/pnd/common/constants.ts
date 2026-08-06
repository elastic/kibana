/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_FEATURE_ID,
  PND_INTERNAL_URL,
  PND_PLUGIN_NAME,
  PND_INVESTIGATIONS_URL,
  PND_INVESTIGATION_URL_TEMPLATE,
  PND_WATCHES_URL,
  PND_WATCH_URL_TEMPLATE,
  buildInvestigationUrl,
  buildWatchUrl,
  SYSTEM_SECURITY_WATCH_IDS,
} from '@kbn/pnd-common';

/** API privilege for read-only PND internal routes. */
export const PND_API_PRIVILEGE_READ = 'pnd_read' as const;

/** POC: write privilege for watch settings / catalogue update routes. */
export const PND_API_PRIVILEGE_WRITE = 'pnd_write' as const;
