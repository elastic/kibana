/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type React from 'react';
import type { GroupingAggregation } from '@kbn/grouping';
import { isNoneGroup } from '@kbn/grouping';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import type { getAlertsGroupingQuery } from './grouping_settings';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { SharedWrapperProps } from './alerts_sub_grouping_types';
import type {
  fetchQueryAlerts,
  fetchQueryUnifiedAlerts,
} from '../../containers/detection_engine/alerts/api';
import { useAlertsGroupingRendering } from './use_alerts_grouping_rendering';

interface AlertsSubGroupingKqlWrapperProps extends SharedWrapperProps {
  queryGroups: ReturnType<typeof getAlertsGroupingQuery>;
  fetchMethod: typeof fetchQueryAlerts | typeof fetchQueryUnifiedAlerts;
  signalIndexName: string | undefined;
}

/**
 * Wrapper component that handles KQL query logic for alerts grouping.
 * This component is responsible for:
 * - Calling useQueryAlerts hook
 * - Managing KQL-specific query state
 * - Processing and rendering the grouping UI
 */
export const AlertsSubGroupingKqlWrapper: React.FC<AlertsSubGroupingKqlWrapperProps> = ({
  queryGroups,
  fetchMethod,
  signalIndexName,
  ...sharedProps
}) => {
  const { selectedGroup } = sharedProps;
  const {
    data: alertsGroupsData,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, GroupingAggregation<AlertsGroupingAggregation>>({
    fetchMethod,
    query: queryGroups,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING,
    skip: isNoneGroup([selectedGroup]),
  });

  // Process KQL data into grouping aggregations
  const groupsData = alertsGroupsData?.aggregations;

  // Handle KQL query setting
  useEffect(() => {
    if (!isNoneGroup([selectedGroup])) {
      const kqlQueryGroups = queryGroups as ReturnType<typeof getAlertsGroupingQuery>;
      setAlertsQuery(kqlQueryGroups);
    }
  }, [queryGroups, selectedGroup, setAlertsQuery]);

  // Use shared rendering hook
  return useAlertsGroupingRendering({
    groupsData,
    queryLoading: isLoadingGroups,
    request,
    response,
    refetch,
    ...sharedProps,
  });
};
