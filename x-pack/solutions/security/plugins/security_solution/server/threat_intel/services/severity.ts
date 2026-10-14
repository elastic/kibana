/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityLevel } from '../../../common/threat_intel';

/** Default ingest severity until enrich_threat_report runs classify_severity. */
export const DEFAULT_SEVERITY_LEVEL: SeverityLevel = 'medium';
export const DEFAULT_SEVERITY_SCORE = 40;

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
