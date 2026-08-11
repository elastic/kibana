/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAlertPrevalenceFromProcessTree } from './use_alert_prevalence_from_process_tree';

export interface UseFetchRelatedAlertsByAncestryParams {
  /**
   * Id of the document
   */
  documentId: string;
  /**
   * Values of the kibana.alert.rule.parameters.index field
   */
  indices: string[];
  /**
   * Optional time range to bound the underlying resolver tree query.
   * When omitted, the query is unbounded.
   */
  interval?: {
    from: string;
    to: string;
  };
}
export interface UseFetchRelatedAlertsByAncestryResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Related alerts by ancestry
   */
  data: string[] | undefined;
  /**
   * Number of alerts
   */
  dataCount: number;
  /**
   * Refetches the data, bypassing the cache.
   */
  refetch: () => void;
}

/**
 * Retrieves all alert related by ancestry then returns a loading, error, data and count interface.
 * This uses the kibana.alert.ancestors.id and kibana.alert.rule.parameters.index fields.
 */
export const useFetchRelatedAlertsByAncestry = ({
  documentId,
  indices,
  interval,
}: UseFetchRelatedAlertsByAncestryParams): UseFetchRelatedAlertsByAncestryResult => {
  const { loading, error, alertIds, refetch } = useAlertPrevalenceFromProcessTree({
    documentId,
    indices,
    interval,
  });

  return useMemo(
    () => ({
      loading,
      error,
      data: alertIds,
      dataCount: alertIds?.length || 0,
      refetch,
    }),
    [alertIds, error, loading, refetch]
  );
};
