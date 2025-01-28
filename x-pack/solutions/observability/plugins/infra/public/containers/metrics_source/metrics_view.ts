/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { DEFAULT_METRICS_VIEW_ATTRIBUTES } from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { resolveAdHocDataView } from '../../utils/data_view';
import { useSourceContext } from './source';

export const useMetricsDataView = () => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const { source } = useSourceContext();

  const [state, refetch] = useAsyncFn(async () => {
    const indexPattern = source?.configuration.metricAlias;
    if (!indexPattern) {
      return Promise.resolve(undefined);
    }

    return resolveAdHocDataView({
      dataViewsService: dataViews,
      dataViewId: indexPattern,
      attributes: {
        name: DEFAULT_METRICS_VIEW_ATTRIBUTES.name,
        timeFieldName: DEFAULT_METRICS_VIEW_ATTRIBUTES.timeFieldName,
      },
    });
  }, [dataViews, source?.configuration.metricAlias]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { value: metricsView, error, loading } = state;

  return {
    metricsView,
    loading,
    error,
    refetch,
  };
};

export const [MetricsDataViewProvider, useMetricsDataViewContext] =
  createContainer(useMetricsDataView);
