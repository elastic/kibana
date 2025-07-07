/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { usePageReady, type Meta } from '@kbn/ebt-tools';
import { initialLoadReported, selectOverviewStatus } from '../state/overview_status';

export const useSyntheticsPageReady = (props?: { meta?: Meta }) => {
  const {
    loaded,
    isInitialLoad,
    loading: isLoadingOverviewStatus,
  } = useSelector(selectOverviewStatus);

  const dispatch = useDispatch();

  usePageReady({
    isReady: loaded,
    customInitialLoad: {
      value: isInitialLoad,
      onInitialLoadReported: () => {
        dispatch(initialLoadReported());
      },
    },
    // This will collect the metric even when we are periodically refreshing the data in the background
    // and not only when the user decides to refresh the data, the action is the same
    isRefreshing: loaded && isLoadingOverviewStatus,
    meta: props?.meta,
  });
};
