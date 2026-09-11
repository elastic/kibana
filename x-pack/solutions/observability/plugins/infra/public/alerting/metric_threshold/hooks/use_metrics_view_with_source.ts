/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMetricsDataViewContext, useSourceContext } from '../../../containers/metrics_source';

export const useMetricsViewWithSource = () => {
  const { source, error: sourceError, isLoading: isSourceLoading, loadSource } = useSourceContext();
  const {
    metricsView,
    error: metricsViewError,
    loading: isMetricsViewLoading,
    refetch: refetchMetricsView,
  } = useMetricsDataViewContext();

  const refetch = useCallback(() => {
    loadSource();
    refetchMetricsView();
  }, [loadSource, refetchMetricsView]);

  return {
    metricsView,
    source,
    isLoading: isSourceLoading || isMetricsViewLoading,
    error: sourceError || metricsViewError?.message,
    refetch,
  };
};
