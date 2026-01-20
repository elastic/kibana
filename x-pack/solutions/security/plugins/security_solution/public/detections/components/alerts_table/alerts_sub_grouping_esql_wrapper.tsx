/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type React from 'react';
import type { BoolQuery } from '@kbn/es-query';
import { isNoneGroup } from '@kbn/grouping';
import { useQueryAlertsEsql } from '../../containers/detection_engine/alerts/use_query_esql';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { SharedWrapperProps } from './alerts_sub_grouping_types';
import { useAlertsGroupingRendering } from './use_alerts_grouping_rendering';

interface AlertsSubGroupingEsqlWrapperProps extends SharedWrapperProps {
  esqlQuery: string;
  boolQuery: BoolQuery;
}

/**
 * Wrapper component that handles ES|QL query logic for alerts grouping.
 * This component is responsible for:
 * - Calling useQueryAlertsEsql hook
 * - Managing ES|QL-specific query state
 * - Processing and rendering the grouping UI
 */
export const AlertsSubGroupingEsqlWrapper: React.FC<AlertsSubGroupingEsqlWrapperProps> = ({
  esqlQuery,
  boolQuery,
  ...sharedProps
}) => {
  const { selectedGroup } = sharedProps;

  // For ES|QL queries, use the dedicated hook with filters
  const {
    data: esqlData,
    loading: esqlLoading,
    request: esqlRequest,
    response: esqlResponseText,
    refetch: esqlRefetch,
    setQuery: setEsqlQuery,
  } = useQueryAlertsEsql<AlertsGroupingAggregation>({
    query: esqlQuery,
    filter: boolQuery,
    skip: isNoneGroup([selectedGroup]),
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING_ESQL,
  });

  // Process ES|QL data into grouping aggregations
  const groupsData = esqlData ?? undefined;

  // Handle ES|QL query setting
  useEffect(() => {
    if (!isNoneGroup([selectedGroup])) {
      setEsqlQuery(esqlQuery);
    }
  }, [selectedGroup, esqlQuery, setEsqlQuery]);

  // Use shared rendering hook
  return useAlertsGroupingRendering({
    groupsData,
    queryLoading: esqlLoading,
    request: esqlRequest,
    response: esqlResponseText,
    refetch: esqlRefetch ?? null,
    ...sharedProps,
  });
};
