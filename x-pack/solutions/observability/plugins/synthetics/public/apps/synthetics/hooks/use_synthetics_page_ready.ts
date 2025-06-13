/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { usePageReady } from '@kbn/ebt-tools';
import { initialTTFMPReported, selectOverviewStatus } from '../state/overview_status';

export const useSyntheticsPageReady = () => {
  const {
    loaded,
    isInitialTTFMPReported,
    loading: isLoadingOverviewStatus,
  } = useSelector(selectOverviewStatus);

  const dispatch = useDispatch();

  usePageReady({
    isReady: loaded,
    isInitialLoadReported: isInitialTTFMPReported,
    onInitialLoadReported: () => {
      dispatch(initialTTFMPReported());
    },
  });
};
