/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hardcoded rather than imported from `@kbn/security-solution-plugin` (open decision 5 in the
 * plan): alertzero has no dependency on security_solution, and adding one just for this path
 * constant would break that isolation. Source of truth:
 * `x-pack/solutions/security/plugins/security_solution/common/threat_intel/constants.ts:46`
 * (`GET_THREAT_REPORT_API_PATH`). Keep this in sync if that route ever moves.
 */
export const THREAT_REPORT_API_PATH = '/internal/threat_intel/reports/{reportId}' as const;

export const THREAT_REPORT_API_VERSION = '1' as const;
