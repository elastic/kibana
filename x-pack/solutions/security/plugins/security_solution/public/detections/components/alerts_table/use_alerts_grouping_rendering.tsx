/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GroupingAggregation } from '@kbn/grouping';
import { parseGroupingQuery } from '@kbn/grouping/src';
import type { DynamicGroupingProps, ParsedGroupingAggregation } from '@kbn/grouping/src';

import { InspectButton } from '../../../common/components/inspect';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useInspectButton } from '../alerts_kpis/common/hooks';

import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { SharedWrapperProps } from './alerts_sub_grouping_types';
import * as i18n from './translations';

const ALERTS_GROUPING_ID = 'alerts-grouping';

export interface UseAlertsGroupingRenderingParams extends SharedWrapperProps {
  /**
   * Grouping aggregation data from the query response
   */
  groupsData: GroupingAggregation<AlertsGroupingAggregation> | undefined;
  /**
   * Loading state from the query hook
   */
  queryLoading: boolean;
  /**
   * Request string for inspect button
   */
  request: string | null;
  /**
   * Response string for inspect button
   */
  response: string | null;
  /**
   * Refetch function for inspect button
   */
  refetch: (() => Promise<void>) | null;
}

/**
 * Shared hook that handles rendering logic for alerts grouping.
 * This hook is query-type agnostic and can be used by both ES|QL and KQL wrappers.
 *
 * Responsibilities:
 * - Process grouping data through parseGroupingQuery
 * - Handle onAggregationsChange callback
 * - Set up inspect button
 * - Create pagination callbacks
 * - Render the grouping component
 */
export const useAlertsGroupingRendering = ({
  groupsData,
  queryLoading,
  request,
  response,
  refetch,
  selectedGroup,
  uniqueValue,
  groupingLevel,
  onAggregationsChange,
  loading: externalLoading,
  getGrouping,
  takeActionItems,
  pageIndex,
  pageSize,
  setPageIndex,
  setPageSize,
  onGroupClose,
  renderChildComponent,
  additionalToolbarControls = [],
}: UseAlertsGroupingRenderingParams): React.ReactElement => {
  const queriedGroupRef = useRef<string | null>(null);

  // Update queriedGroup ref when selectedGroup changes (but before query response)
  useEffect(() => {
    queriedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Process grouping data into parsed aggregations
  const aggs = useMemo(
    // queriedGroupRef because `selectedGroup` updates before the query response
    () =>
      parseGroupingQuery(
        // fallback to selectedGroup if queriedGroupRef.current is null, this happens in tests
        queriedGroupRef.current === null ? selectedGroup : queriedGroupRef.current,
        uniqueValue,
        groupsData
      ),
    [groupsData, selectedGroup, uniqueValue]
  );

  // Notify parent component when aggregations change
  useEffect(() => {
    if (!queryLoading) {
      onAggregationsChange?.(
        aggs as ParsedGroupingAggregation<AlertsGroupingAggregation>,
        groupingLevel
      );
    }
  }, [aggs, groupingLevel, queryLoading, onAggregationsChange]);

  const { deleteQuery, setQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  useInspectButton({
    deleteQuery,
    loading: queryLoading,
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

  const onChangeGroupsItemsPerPage = useCallback(
    (size: number) => setPageSize(size),
    [setPageSize]
  );

  const onChangeGroupsPage = useCallback((index: number) => setPageIndex(index), [setPageIndex]);

  return useMemo(
    () =>
      getGrouping({
        activePage: pageIndex,
        data: aggs as ParsedGroupingAggregation<AlertsGroupingAggregation>,
        groupingLevel,
        additionalToolbarControls: [...additionalToolbarControls, inspect],
        isLoading: externalLoading || queryLoading,
        itemsPerPage: pageSize,
        onChangeGroupsItemsPerPage,
        onChangeGroupsPage,
        onGroupClose,
        renderChildComponent,
        selectedGroup,
        ...(takeActionItems && { takeActionItems }),
      } as Omit<DynamicGroupingProps<AlertsGroupingAggregation>, 'groupSelector' | 'pagination'>),
    [
      aggs,
      getGrouping,
      groupingLevel,
      inspect,
      queryLoading,
      externalLoading,
      onChangeGroupsItemsPerPage,
      onChangeGroupsPage,
      onGroupClose,
      pageIndex,
      pageSize,
      renderChildComponent,
      selectedGroup,
      additionalToolbarControls,
      takeActionItems,
    ]
  );
};
