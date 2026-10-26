/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hardcoded rather than imported from `@kbn/security-solution-plugin`: alertzero has no
 * dependency on security_solution, and adding one just for this path constant would break
 * that isolation. Source of truth:
 * `x-pack/solutions/security/plugins/security_solution/common/threat_intel/constants.ts`
 * (`GET_THREAT_REPORT_API_PATH`). Keep this in sync if that route ever moves.
 */
export const THREAT_REPORT_API_PATH = '/internal/threat_intel/reports/{reportId}' as const;

export const THREAT_REPORT_API_VERSION = '1' as const;

/**
 * Wire shape of the internal `GET /internal/threat_intel/reports/{reportId}` response
 * (`GetThreatReportResponse` in security_solution). The renderer reads this response
 * directly rather than mapping it into a separate camelCase live-data shape.
 */
export interface ThreatReportApiResponse {
  reportId?: string;
  content?: {
    title?: string;
    external_references?: Array<{ source_name?: string; url?: string; external_id?: string }>;
  };
  severity?: { level?: string; score?: number };
  source?: { name?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string; severity?: string; tier?: string }>;
    ttps?: { tactics?: string[]; techniques?: string[] };
    categories?: string[];
    diamond?: {
      adversary?: { signal?: string; summary?: string };
      capability?: { signal?: string; summary?: string };
      infrastructure?: { signal?: string; summary?: string };
      victim?: { signal?: string; summary?: string };
      signal_count?: number;
      suitable?: boolean;
    };
  };
  geography?: { regions?: string[] };
  rank_score?: number;
  evidence?: {
    alert_hits_total?: number;
    last_hunt_status?: string;
    last_hunted_at?: string;
    last_hunt_run_id?: string;
    corroborated_rank_score?: number;
  };
}
