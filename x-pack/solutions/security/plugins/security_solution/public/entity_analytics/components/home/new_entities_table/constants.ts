/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';

export type TimeRange = '24h' | '7d' | '30d';

export const TIME_RANGE_OPTIONS: Array<{ id: TimeRange; label: string }> = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
];

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const RESOLUTION_GROUPING_ID = 'ea-new-home-resolution';

export const GRID_COLUMNS: EuiDataGridColumn[] = [
  { id: 'actions', displayAsText: 'Actions', initialWidth: 100, isSortable: false },
  { id: 'entity.name', displayAsText: 'Entity name', initialWidth: 200 },
  { id: 'group_size', displayAsText: 'Records', initialWidth: 100, isSortable: true },
  { id: 'entity.EngineMetadata.Type', displayAsText: 'Entity type', initialWidth: 120 },
  { id: 'entity.risk.calculated_score_norm', displayAsText: 'Risk score', initialWidth: 120 },
  { id: 'risk_score_change', displayAsText: 'Risk score change', initialWidth: 140 },
  { id: 'asset.criticality', displayAsText: 'Asset criticality', initialWidth: 160 },
  { id: 'entity.source', displayAsText: 'Source', initialWidth: 140, isSortable: false },
  { id: 'alert_count', displayAsText: 'Alerts', initialWidth: 100, isSortable: true },
  { id: 'last_seen_alert', displayAsText: 'Last alert', initialWidth: 180 },
  { id: 'anomaly_count', displayAsText: 'Anomalies', initialWidth: 120, isSortable: true },
  { id: 'case_count', displayAsText: 'Cases', initialWidth: 100, isSortable: false },
  {
    id: 'entity.attributes.watchlists',
    displayAsText: 'Watchlists',
    initialWidth: 200,
    isSortable: false,
  },
  { id: 'entity.lifecycle.first_seen', displayAsText: 'First seen', initialWidth: 180 },
  { id: '@timestamp', displayAsText: 'Last seen', initialWidth: 180 },
];

export const CHILD_GRID_COLUMNS = GRID_COLUMNS.filter((c) => c.id !== 'group_size');

export const RAW_GRID_COLUMNS: EuiDataGridColumn[] = GRID_COLUMNS.map((c) =>
  c.id === 'group_size'
    ? {
        id: 'entity.relationships.resolution.resolved_to',
        displayAsText: 'Resolved to',
        initialWidth: 200,
        isSortable: false,
      }
    : c
);

export interface EntityGridResponse {
  entities: Array<Record<string, unknown>>;
  next_cursor: string | null;
  total: number | null;
}
