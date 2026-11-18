/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../common/constants/monitor_management';

/** Keys skipped by whole-object param substitution (formatters). */
export const PARAMS_KEYS_TO_SKIP = [
  'secrets',
  'fields',
  ConfigKey.PARAMS,
  ConfigKey.PROJECT_ID,
  ConfigKey.JOURNEY_ID,
  ConfigKey.CONFIG_HASH,
  ConfigKey.MONITOR_QUERY_ID,
  ConfigKey.LOCATIONS,
  ConfigKey.TLS_VERSION,
  ConfigKey.SOURCE_PROJECT_CONTENT,
  ConfigKey.SOURCE_INLINE,
  ConfigKey.RESPONSE_JSON_CHECK,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  // Per-field resolve via resolveHttpAuthParams (public + private); skip the
  // whole-object JSON-stringify substitution path which breaks on quotes/newlines.
  ConfigKey.KERBEROS,
  ConfigKey.NTLM,
];

/**
 * Keys skipped when scanning monitors for `${param}` references.
 * Unlike PARAMS_KEYS_TO_SKIP, Kerberos/NTLM stay so a credential-only param
 * still triggers private-location redeploy on param update.
 */
export const PARAMS_REFERENCE_SCAN_SKIP = PARAMS_KEYS_TO_SKIP.filter(
  (key) => key !== ConfigKey.KERBEROS && key !== ConfigKey.NTLM
);
