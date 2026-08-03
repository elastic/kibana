/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityLevel } from '../../../common/threat_intelligence/hub';

/**
 * Default severity for adapter-emitted reports.
 *
 * Matches the legacy YAML which hard-coded `medium` / `40` for every
 * branch. Per-adapter severity (CVSS for NVD, STIX confidence, vendor
 * scoring) remains optional at ingest; the `enrich_threat_report`
 * workflow's `classify_severity` step refines `severity.level` /
 * `severity.score` (and `rank_score`) from report content after IOCs
 * and taxonomy are available. Until that enrich pass runs, `medium` is
 * the safe default — it doesn't fire digests' `high+` filters and it
 * doesn't hide rows in the dashboard's `>= medium` default view.
 */
export const DEFAULT_SEVERITY_LEVEL: SeverityLevel = 'medium';
export const DEFAULT_SEVERITY_SCORE = 40;

/** Mirror of `services/create_threat_report.ts:severityScore` so manual and adapter ingestion agree. */
export const severityScore = (level: SeverityLevel): number => {
  switch (level) {
    case 'critical':
      return 90;
    case 'high':
      return 70;
    case 'medium':
      return 40;
    case 'low':
    default:
      return 20;
  }
};
