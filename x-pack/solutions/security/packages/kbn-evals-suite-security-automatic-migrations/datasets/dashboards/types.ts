/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

/**
 * Panel-level ground truth for a single translated panel.
 *
 * NOTE: Ground truth is defined at the panel level because most evaluators
 * operate per-panel (E1: lookup join, E2: ES|QL validity, E3: markdown errors,
 * E7: index pattern). The dashboard-level evaluators (E5: panel count, E6:
 * translation completeness) derive their expected values from the panel array.
 */
export interface ExpectedPanel {
  /** Panel title from the source Splunk dashboard */
  title: string;
  /** Expected ES|QL query for this panel (null for markdown panels) */
  esql_query: string | null;
  /** Expected index pattern in the FROM clause (null for markdown panels) */
  index_pattern: string | null;
  /** Expected translation result status */
  translation_result: 'full' | 'partial' | 'untranslatable';
  /** Whether the source SPL uses lookup commands for this panel */
  has_lookups: boolean;
  /** Whether this is a markdown panel */
  is_markdown: boolean;
}

/**
 * Input shape matching what the production API expects.
 * The `original_dashboard_export` field matches the Splunk export format
 * accepted by POST /internal/siem_migrations/dashboards/{migration_id}/dashboards
 */
export interface DashboardInput {
  /** Splunk dashboard export object matching the bulk upload API format */
  original_dashboard_export: {
    /** Present in some Splunk export formats (e.g. v2 exports) */
    preview?: boolean;
    result: {
      id: string;
      title: string;
      label: string;
      /** Not always present in Splunk exports */
      description?: string;
      /** Splunk dashboard version (e.g. "2" for SimpleXML v2) */
      version?: string;
      'eai:data': string; // Raw Splunk XML
      'eai:acl.app': string;
      'eai:acl.owner': string;
      'eai:acl.sharing': string;
      updated: string;
    };
  };
  /** Macros and lookups the dashboard depends on */
  resources: Array<{
    type: 'macro' | 'lookup';
    name: string;
    content: string;
  }>;
}

export interface DashboardExpected {
  /** Total panel count in the source dashboard */
  panel_count: number;
  /** Panel-level ground truth */
  panels: ExpectedPanel[];
  /** Category for conditional evaluator logic */
  category: 'standard' | 'complex' | 'edge_case';
}

export interface DashboardMetadata {
  category: 'standard' | 'complex' | 'edge_case';
  has_lookups: boolean;
  has_markdown_panels: boolean;
  panel_count: number;
  complexity: 'low' | 'medium' | 'high';
}

export type DashboardExample = Example<
  DashboardInput & Record<string, unknown>,
  DashboardExpected,
  DashboardMetadata & Record<string, unknown>
>;
