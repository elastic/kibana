/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSeverity } from '@kbn/agentic-investigations-plugin/common';

/*
 * The shared investigations query API (agenticInvestigations). Spelled out rather than imported,
 * so this plugin does not load the agentic investigations bundle on every page; a test pins them.
 */
export const SHARED_INVESTIGATIONS_URL = '/internal/investigations/investigations';
export const SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL =
  '/internal/investigations/investigations/_severity_counts';
export const SHARED_INVESTIGATIONS_API_VERSION = '1';

/** The list API reaches at most this many investigations per filter. */
export const MAX_SHARED_INVESTIGATIONS = 1000;

/**
 * Nightshift's landing page groups investigations in the significant-events severity tiers; an
 * investigation records the template's severity. The mapping lives in the UI only.
 */
export const SEVERITY_TIER_TO_INVESTIGATION_SEVERITY: Record<Severity, InvestigationSeverity> = {
  '80-critical': 'critical',
  '60-high': 'high',
  '40-medium': 'medium',
  '20-low': 'low',
};
