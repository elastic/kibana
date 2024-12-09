/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAlertPrevalence } from './use_alert_prevalence';
import { isActiveTimeline } from '../../../../helpers';
import { ENTRY_LEADER_ENTITY_ID } from '../constants/field_names';

export interface UseFetchRelatedAlertsBySessionParams {
  /**
   * Value of the process.entry_leader.entity_id field
   */
  entityId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsBySessionResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Related alerts by session retrieved
   */
  data: string[];
  /**
   * Number of alerts by session received
   */
  dataCount: number;
}

/**
 * Returns the number of alerts by session for the document (and the loading, error statuses as well as the alerts count)
 */
export const useFetchRelatedAlertsBySession = ({
  entityId,
  scopeId,
}: UseFetchRelatedAlertsBySessionParams): UseFetchRelatedAlertsBySessionResult => {
  const { loading, error, count, alertIds } = useAlertPrevalence({
    field: ENTRY_LEADER_ENTITY_ID,
    value: entityId,
    isActiveTimelines: isActiveTimeline(scopeId),
    indexName: null,
    includeAlertIds: true,
    ignoreTimerange: true,
  });

  return useMemo(
    () => ({
      loading,
      error,
      data: alertIds || [],
      dataCount: count || 0,
    }),
    [alertIds, count, error, loading]
  );
};
