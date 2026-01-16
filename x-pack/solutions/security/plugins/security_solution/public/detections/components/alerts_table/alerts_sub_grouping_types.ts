/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import type { NamedAggregation } from '@kbn/grouping';
import type {
  DynamicGroupingProps,
  GroupChildComponentRenderer,
  ParsedGroupingAggregation,
} from '@kbn/grouping/src';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { PageScope } from '../../../data_view_manager/constants';
import type { GroupTakeActionItems } from './types';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { combineQueries } from '../../../common/lib/kuery';

/**
 * Shared props interface for common props passed to both ES|QL and KQL wrapper components
 */
export interface SharedWrapperProps {
  defaultFilters: Filter[];
  from: string;
  to: string;
  getGrouping: (
    props: Omit<DynamicGroupingProps<AlertsGroupingAggregation>, 'groupSelector' | 'pagination'>
  ) => React.ReactElement;
  globalFilters: Filter[];
  globalQuery: Query;
  groupingLevel?: number;
  groupStatsAggregations: (field: string) => NamedAggregation[];
  groupTakeActionItems?: GroupTakeActionItems;
  loading: boolean;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: string;
  renderChildComponent: GroupChildComponentRenderer<AlertsGroupingAggregation>;
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
  tableId: TableIdLiteral;
  additionalToolbarControls?: JSX.Element[];
  multiValueFieldsToFlatten?: string[];
  pageScope?: PageScope;
  onAggregationsChange?: (
    aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
    groupingLevel?: number
  ) => void;
  uniqueValue: string;
  getGlobalQuery: (customFilters: Filter[]) => ReturnType<typeof combineQueries> | null;
  takeActionItems?: (
    groupFilters: Filter[],
    groupNumber: number
  ) => {
    items: EuiContextMenuPanelItemDescriptor[];
    panels: EuiContextMenuPanelDescriptor[];
  };
}
