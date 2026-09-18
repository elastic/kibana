/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
/** Best-effort default for IOC Discover lookups when no index pattern is provided. */
export const DEFAULT_LOGS_INDEX_PATTERN = 'logs-*' as const;
/** Mirrors Security `APP_PATH` + `ALERT_DETAILS_REDIRECT_PATH` without importing security_solution. */
export const SECURITY_ALERT_DETAILS_REDIRECT_PATH = '/app/security/alerts/redirect' as const;
