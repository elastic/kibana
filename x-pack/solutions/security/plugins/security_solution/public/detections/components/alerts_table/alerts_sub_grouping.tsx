/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query } from '@kbn/es-query';
import type { NamedAggregation } from '@kbn/grouping';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type {
  DynamicGroupingProps,
  GroupChildComponentRenderer,
  ParsedGroupingAggregation,
} from '@kbn/grouping/src';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import type { GroupTakeActionItems } from './types';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { RunTimeMappings } from '../../../sourcerer/store/model';
import { combineQueries } from '../../../common/lib/kuery';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../../common/lib/kibana';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { buildTimeRangeFilter } from './helpers';
import { getAlertsGroupingQuery } from './grouping_settings';
import { buildAlertsGroupingFilters } from './grouping_settings/filter_builder';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import {
  fetchQueryAlerts,
  fetchQueryUnifiedAlerts,
} from '../../containers/detection_engine/alerts/api';
import { AlertsSubGroupingEsqlWrapper } from './alerts_sub_grouping_esql_wrapper';
import { AlertsSubGroupingKqlWrapper } from './alerts_sub_grouping_kql_wrapper';

const DEFAULT_FILTERS: Filter[] = [];

interface OwnProps {
  defaultFilters?: Filter[];
  from: string;
  getGrouping: (
    props: Omit<DynamicGroupingProps<AlertsGroupingAggregation>, 'groupSelector' | 'pagination'>
  ) => React.ReactElement;
  globalFilters: Filter[];
  globalQuery: Query;
  groupingLevel?: number;
  /**
   * Function that returns the group aggregations by field.
   * This is then used to render values in the EuiAccordion `extraAction` section.
   */
  groupStatsAggregations: (field: string) => NamedAggregation[];
  /**
   * Allows to customize the content of the Take actions button rendered at the group level.
   * If no value is provided, the Take actins button is not displayed.
   */
  groupTakeActionItems?: GroupTakeActionItems;
  loading: boolean;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: string;
  renderChildComponent: GroupChildComponentRenderer<AlertsGroupingAggregation>;
  runtimeMappings: RunTimeMappings;
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
  signalIndexName: string | undefined;
  tableId: TableIdLiteral;
  to: string;

  /** Optional array of custom controls to display in the toolbar alongside the group selector */
  additionalToolbarControls?: JSX.Element[];

  /**
   * If you're not using this property, multi-value fields will be transformed into a string
   * and grouped by that value. For instance, if an object has a property
   * called "mac" with value ['mac1', 'mac2'], the query will stringify that value
   * to "mac1, mac2" and then group by it.
   *
   * Using this property will create a bucket for each value of the multi-value fields in question.
   * Following the example above, a field with the ['mac1', 'mac2'] value will be grouped
   * in 2 groups: one for mac1 and a second formac2.
   */
  multiValueFieldsToFlatten?: string[];

  /**
   * Data view scope
   */
  pageScope?: PageScope;

  /**
   * A callback function that is invoked whenever the grouping aggregations are updated.
   * It receives the parsed aggregation data as its only argument. This can be used to
   * react to changes in the grouped data, for example, to extract information from
   * the aggregation results.
   */
  onAggregationsChange?: (
    aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
    groupingLevel?: number
  ) => void;

  /**
   * Optional ES|QL query string. If provided, ES|QL query will be used instead of KQL-based grouping query.
   * The query should return at least two columns: grouping key and count (e.g., `STATS count BY field_name`).
   */
  esqlQuery?: string;
}

export type AlertsTableComponentProps = OwnProps;

export const GroupedSubLevelComponent: React.FC<AlertsTableComponentProps> = ({
  defaultFilters = DEFAULT_FILTERS,
  from,
  getGrouping,
  globalFilters,
  globalQuery,
  groupingLevel,
  groupStatsAggregations,
  groupTakeActionItems,
  loading,
  onGroupClose,
  pageIndex,
  pageSize,
  parentGroupingFilter,
  renderChildComponent,
  runtimeMappings,
  selectedGroup,
  setPageIndex,
  setPageSize,
  signalIndexName,
  tableId,
  to,
  additionalToolbarControls = [],
  multiValueFieldsToFlatten,
  pageScope = PageScope.alerts,
  onAggregationsChange,
  esqlQuery,
}) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { browserFields: oldBrowserFields, sourcererDataView: oldSourcererDataView } =
    useSourcererDataView(pageScope);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { dataView: experimentalDataView } = useDataView(pageScope);
  const experimentalBrowserFields = useBrowserFields(pageScope);

  const sourcererDataView = oldSourcererDataView;
  const browserFields = newDataViewPickerEnabled ? experimentalBrowserFields : oldBrowserFields;

  // Build filters using the shared utility function
  // This provides filters in both formats needed for KQL and ES|QL queries
  const { additionalFilters, boolQuery } = useMemo(
    () =>
      buildAlertsGroupingFilters({
        defaultFilters,
        globalFilters,
        globalQuery,
        parentGroupingFilter,
        from,
        to,
      }),
    [defaultFilters, globalFilters, globalQuery, parentGroupingFilter, from, to]
  );

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && sourcererDataView) {
        return combineQueries({
          config: getEsQueryConfig(uiSettings),
          dataProviders: [],
          dataViewSpec: sourcererDataView,
          dataView: experimentalDataView,
          browserFields,
          filters: [
            ...defaultFilters,
            ...globalFilters,
            ...customFilters,
            ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
            ...buildTimeRangeFilter(from, to),
          ],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
        });
      }
      return null;
    },
    [
      browserFields,
      sourcererDataView,
      uiSettings,
      experimentalDataView,
      defaultFilters,
      globalFilters,
      parentGroupingFilter,
      from,
      to,
      globalQuery,
    ]
  );

  // create a unique, but stable (across re-renders) value
  const uniqueValue = useMemo(() => `SuperUniqueValue-${uuidv4()}`, []);

  // Build KQL query only when not using ES|QL
  const queryGroups = useMemo(() => {
    if (esqlQuery) {
      return null; // Don't build KQL query when using ES|QL
    }
    return getAlertsGroupingQuery({
      groupStatsAggregations,
      additionalFilters,
      selectedGroup,
      uniqueValue,
      from,
      runtimeMappings,
      to,
      pageSize,
      pageIndex,
      multiValueFieldsToFlatten,
    });
  }, [
    esqlQuery,
    additionalFilters,
    from,
    groupStatsAggregations,
    pageIndex,
    pageSize,
    runtimeMappings,
    selectedGroup,
    to,
    uniqueValue,
    multiValueFieldsToFlatten,
  ]);

  const emptyGlobalQuery = useMemo(() => getGlobalQuery([]), [getGlobalQuery]);

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: emptyGlobalQuery?.filterQuery,
    kqlError: emptyGlobalQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const fetchMethod = useMemo(() => {
    return pageScope === PageScope.attacks ? fetchQueryUnifiedAlerts : fetchQueryAlerts;
  }, [pageScope]);

  // Build getTakeActionItems callback (shared by both wrappers)
  const getTakeActionItems = useCallback(
    (groupFilters: Filter[], groupNumber: number) => {
      const takeActionParams = {
        groupNumber,
        query: getGlobalQuery([...(defaultFilters ?? []), ...groupFilters])?.filterQuery,
        selectedGroup,
        tableId,
      };

      return groupTakeActionItems?.(takeActionParams) ?? { items: [], panels: [] };
    },
    [defaultFilters, getGlobalQuery, groupTakeActionItems, selectedGroup, tableId]
  );

  // Compute takeActionItems prop (only if groupTakeActionItems is provided)
  const takeActionItems = useMemo(
    () => (groupTakeActionItems ? getTakeActionItems : undefined),
    [groupTakeActionItems, getTakeActionItems]
  );

  // Shared props for both wrapper components
  const sharedWrapperProps = useMemo(
    () => ({
      defaultFilters,
      from,
      to,
      getGrouping,
      globalFilters,
      globalQuery,
      groupingLevel,
      groupStatsAggregations,
      groupTakeActionItems,
      loading,
      onGroupClose,
      pageIndex,
      pageSize,
      parentGroupingFilter,
      renderChildComponent,
      selectedGroup,
      setPageIndex,
      setPageSize,
      tableId,
      additionalToolbarControls,
      multiValueFieldsToFlatten,
      pageScope,
      onAggregationsChange,
      uniqueValue,
      getGlobalQuery,
      takeActionItems,
    }),
    [
      defaultFilters,
      from,
      to,
      getGrouping,
      globalFilters,
      globalQuery,
      groupingLevel,
      groupStatsAggregations,
      groupTakeActionItems,
      loading,
      onGroupClose,
      pageIndex,
      pageSize,
      parentGroupingFilter,
      renderChildComponent,
      selectedGroup,
      setPageIndex,
      setPageSize,
      tableId,
      additionalToolbarControls,
      multiValueFieldsToFlatten,
      pageScope,
      onAggregationsChange,
      uniqueValue,
      getGlobalQuery,
      takeActionItems,
    ]
  );

  // Conditionally render ES|QL or KQL wrapper
  if (esqlQuery) {
    return (
      <AlertsSubGroupingEsqlWrapper
        {...sharedWrapperProps}
        esqlQuery={esqlQuery}
        boolQuery={boolQuery}
      />
    );
  }

  // At this point, queryGroups is guaranteed to be non-null since esqlQuery is falsy
  if (!queryGroups) {
    return null;
  }

  return (
    <AlertsSubGroupingKqlWrapper
      {...sharedWrapperProps}
      queryGroups={queryGroups}
      fetchMethod={fetchMethod}
      signalIndexName={signalIndexName}
    />
  );
};

export const GroupedSubLevel = React.memo(GroupedSubLevelComponent);
