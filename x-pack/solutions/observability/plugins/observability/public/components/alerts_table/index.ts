/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Main components - use lazy version for async loading
export { ObservabilityAlertsTableLazy } from './alerts_table_lazy';
export { ObservabilityAlertsTable } from './alerts_table';

// Cell renderers
export { AlertsTableCellValue, getAlertFieldValue } from './common/cell_value';
export { CellTooltip } from './common/cell_tooltip';
export { TimestampTooltip } from './common/timestamp_tooltip';
export { getColumns } from './common/get_columns';

// Grouping
export { getGroupStats } from './grouping/get_group_stats';
export { getAggregationsByGroupingField } from './grouping/get_aggregations_by_grouping_field';
export { renderGroupPanel } from './grouping/render_group_panel';
export { GroupingToolbarControls } from './grouping/grouping_toolbar_controls';
export { DEFAULT_GROUPING_OPTIONS, ungrouped, ruleName, source } from './grouping/constants';

// Supporting components
export { AlertSeverityBadge } from './components/alert_severity_badge';
export { AlertStatusIndicator } from './components/alert_status_indicator';
export { Tags } from './components/tags';
export { AlertActions } from './components/alert_actions';
export { useCaseActions } from './components/use_case_actions';

// Types
export type {
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
  GetObservabilityAlertsTableProp,
  BucketItem,
  AlertsByGroupingAgg,
  ObservabilityRuleTypeRegistry,
  ConfigSchema,
  TopAlert,
} from './types';

