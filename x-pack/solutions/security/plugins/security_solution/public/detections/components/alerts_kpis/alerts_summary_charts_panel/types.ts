/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { AlertsBySeverityAgg } from '../severity_level_panel/types';
import type { AlertsByRuleAgg, AlertsByRuleData } from '../alerts_by_rule_panel/types';
import type {
  AlertsByGroupingAgg,
  AlertsProgressBarData,
} from '../alerts_progress_bar_panel/types';
import type { ChartCollapseAgg, ChartCollapseData } from '../chart_panels/chart_collapse/types';
import type { AddFilterProps } from '../common/types';

export type SummaryChartsAgg = Partial<
  AlertsBySeverityAgg | AlertsByRuleAgg | AlertsByGroupingAgg | ChartCollapseAgg
>;

export type SummaryChartsData =
  | SeverityData
  | AlertsByRuleData
  | AlertsProgressBarData
  | ChartCollapseData;

export interface ChartsPanelProps {
  /**
   * Filters to use when fetching the chart data
   */
  filters?: Filter[];
  /**
   * Query to use when fetching the chart data (comes from Redux when used in combination with the SiemSearchBar)
   */
  query?: Query;
  /**
   * Indices to use when fetching the chart data
   */
  signalIndexName: string | null;
  /**
   * Runtime mappings to use when fetching the chart data
   */
  runtimeMappings?: MappingRuntimeFields;
  /**
   * If true, prevents the data from being fetched
   */
  skip?: boolean;
  /**
   * Callback to allow the charts to add filters to the SiemSearchBar
   */
  addFilter?: ({ field, value, negate }: AddFilterProps) => void;
  /**
   * If true, make the cell action interactions visible (filter for, filter out, add to timeline, copy...)
   */
  showCellActions?: boolean;
}
