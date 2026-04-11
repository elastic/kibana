/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { SyntheticsCCSSettings } from '../../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../../common/constants';
import { apiService } from '../../../../../../utils/api_service';
import { SyntheticsRefreshContext } from '../../../../contexts';

export const DEFAULT_CCS_SETTINGS: SyntheticsCCSSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  remoteKibanaUrls: {},
};

const fetchCCSSettings = async () => {
  try {
    return await apiService.get<SyntheticsCCSSettings>(SYNTHETICS_API_URLS.CCS_SETTINGS);
  } catch (e) {
    return DEFAULT_CCS_SETTINGS;
  }
};

export const useGetCCSSettings = () => {
  const { lastRefresh } = useContext(SyntheticsRefreshContext);

  const { data, error, loading } = useFetcher(fetchCCSSettings, [lastRefresh]);

  return {
    data: data ?? DEFAULT_CCS_SETTINGS,
    error,
    loading,
  };
};
