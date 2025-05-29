/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { GroupingAggregation, NamedAggregation } from '@kbn/grouping';
import { isNoneGroup } from '@kbn/grouping';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DynamicGroupingProps } from '@kbn/grouping/src';
import { parseGroupingQuery } from '@kbn/grouping/src';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import type { GroupTakeActionItems } from './types';
import type { RunTimeMappings } from '../../../sourcerer/store/model';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { combineQueries } from '../../../common/lib/kuery';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import { InspectButton } from '../../../common/components/inspect';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../../common/lib/kibana';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { useInspectButton } from '../alerts_kpis/common/hooks';
import { buildTimeRangeFilter } from './helpers';

import * as i18n from './translations';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import { getAlertsGroupingQuery } from './grouping_settings';

const ALERTS_GROUPING_ID = 'alerts-grouping';
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
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  runtimeMappings: RunTimeMappings;
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
  signalIndexName: string | null;
  tableId: TableIdLiteral;
  to: string;
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
}) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.detections);

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPattern != null) {
        return combineQueries({
          config: getEsQueryConfig(uiSettings),
          dataProviders: [],
          indexPattern,
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
      defaultFilters,
      from,
      globalFilters,
      globalQuery,
      indexPattern,
      parentGroupingFilter,
      to,
      uiSettings,
    ]
  );

  const additionalFilters = useMemo(() => {
    try {
      return [
        buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
          ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
          ...(defaultFilters ?? []),
          ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
        ]),
      ];
    } catch (e) {
      return [];
    }
  }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

  // create a unique, but stable (across re-renders) value
  const uniqueValue = useMemo(() => `SuperUniqueValue-${uuidv4()}`, []);

  const queryGroups = useMemo(() => {
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
    });
  }, [
    additionalFilters,
    from,
    groupStatsAggregations,
    pageIndex,
    pageSize,
    runtimeMappings,
    selectedGroup,
    to,
    uniqueValue,
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

  const {
    data: alertsGroupsData,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, GroupingAggregation<AlertsGroupingAggregation>>({
    query: queryGroups,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING,
    skip: isNoneGroup([selectedGroup]),
  });

  const queriedGroup = useRef<string | null>(null);

  const aggs = useMemo(
    // queriedGroup because `selectedGroup` updates before the query response
    () =>
      parseGroupingQuery(
        // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
        queriedGroup.current === null ? selectedGroup : queriedGroup.current,
        uniqueValue,
        alertsGroupsData?.aggregations
      ),
    [alertsGroupsData?.aggregations, selectedGroup, uniqueValue]
  );

  useEffect(() => {
    if (!isNoneGroup([selectedGroup])) {
      queriedGroup.current =
        queryGroups?.runtime_mappings?.groupByField?.script?.params?.selectedGroup ?? '';
      setAlertsQuery(queryGroups);
    }
  }, [queryGroups, selectedGroup, setAlertsQuery]);

  const { deleteQuery, setQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  useInspectButton({
    deleteQuery,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery,
    uniqueQueryId,
  });

  const inspect = useMemo(
    () => (
      <InspectButton queryId={uniqueQueryId} inspectIndex={0} title={i18n.INSPECT_GROUPING_TITLE} />
    ),
    [uniqueQueryId]
  );

  const getTakeActionItems = useCallback(
    (groupFilters: Filter[], groupNumber: number) => {
      const takeActionParams = {
        groupNumber,
        query: getGlobalQuery([...(defaultFilters ?? []), ...groupFilters])?.filterQuery,
        selectedGroup,
        tableId,
      };

      return groupTakeActionItems?.(takeActionParams) ?? [];
    },
    [defaultFilters, getGlobalQuery, groupTakeActionItems, selectedGroup, tableId]
  );

  const onChangeGroupsItemsPerPage = useCallback(
    (size: number) => setPageSize(size),
    [setPageSize]
  );

  const onChangeGroupsPage = useCallback((index: number) => setPageIndex(index), [setPageIndex]);

  return useMemo(
    () =>
      getGrouping({
        activePage: pageIndex,
        data: aggs,
        groupingLevel,
        inspectButton: inspect,
        isLoading: loading || isLoadingGroups,
        itemsPerPage: pageSize,
        onChangeGroupsItemsPerPage,
        onChangeGroupsPage,
        onGroupClose,
        renderChildComponent,
        selectedGroup,
        ...(groupTakeActionItems && { takeActionItems: getTakeActionItems }),
      }),
    [
      aggs,
      getGrouping,
      getTakeActionItems,
      groupingLevel,
      groupTakeActionItems,
      inspect,
      isLoadingGroups,
      loading,
      onChangeGroupsItemsPerPage,
      onChangeGroupsPage,
      onGroupClose,
      pageIndex,
      pageSize,
      renderChildComponent,
      selectedGroup,
    ]
  );
};

export const GroupedSubLevel = React.memo(GroupedSubLevelComponent);
