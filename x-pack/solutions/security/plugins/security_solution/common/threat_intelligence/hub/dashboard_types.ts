/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityLevel, ThreatCategory, ThreatRegion } from './constants';

/**
 * Shared response shape for the visual dashboard overview endpoint
 * (`DASHBOARD_OVERVIEW_API_PATH`). Defined in `common/` so the server route
 * and the public dashboard panels share a single source of truth.
 */
export interface DashboardOverviewResponse {
  time_range_label: string;
  stats_ribbon: {
    total_reports: number;
    critical_reports: number;
    high_reports: number;
    affects_you_total: number;
  };
  by_category: Array<{
    category: ThreatCategory | '<unknown>';
    report_count: number;
  }>;
  by_region: Array<{
    region: ThreatRegion | '<unknown>';
    report_count: number;
    affects_you: boolean;
  }>;
  severity_timeline: Array<{
    bucket: string;
    low: number;
    medium: number;
    high: number;
    critical: number;
  }>;
  top_techniques: Array<{
    technique_id: string;
    report_count: number;
  }>;
  recent_articles: Array<{
    report_id: string;
    title: string;
    source_name: string;
    severity: SeverityLevel;
    '@timestamp': string;
    environment_hits_total: number;
    categories: ThreatCategory[];
    regions: ThreatRegion[];
  }>;
  environment_impact: {
    total_hits: number;
    layer_1_hits: number;
    layer_2_hits: number;
    affected_assets_sample: string[];
  };
}
