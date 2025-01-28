/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAlertPrevalenceFromProcessTree } from './use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../../helpers';

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
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
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
}

/**
 * Retrieves all alert related by ancestry then returns a loading, error, data and count interface.
 * This uses the kibana.alert.ancestors.id and kibana.alert.rule.parameters.index fields.
 */
export const useFetchRelatedAlertsByAncestry = ({
  documentId,
  indices,
  scopeId,
}: UseFetchRelatedAlertsByAncestryParams): UseFetchRelatedAlertsByAncestryResult => {
  const isActiveTimelines = isActiveTimeline(scopeId);

  const { loading, error, alertIds } = useAlertPrevalenceFromProcessTree({
    isActiveTimeline: isActiveTimelines,
    documentId,
    indices,
  });

  return useMemo(
    () => ({
      loading,
      error,
      data: alertIds,
      dataCount: alertIds?.length || 0,
    }),
    [alertIds, error, loading]
  );
};
