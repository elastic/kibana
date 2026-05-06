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
};

const fetchCCSSettings = async (): Promise<SyntheticsCCSSettings> => {
  try {
    const dynamicSettings = await apiService.get<{
      useAllRemoteClusters?: boolean;
      selectedRemoteClusters?: string[];
    }>(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS);
    return {
      useAllRemoteClusters: dynamicSettings.useAllRemoteClusters ?? false,
      selectedRemoteClusters: dynamicSettings.selectedRemoteClusters ?? [],
    };
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
