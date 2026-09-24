/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { apiService } from '../../../../../utils/api_service';

export const useCanManageClusterSettings = (): { canManage: boolean; loading: boolean } => {
  const { data, loading } = useFetcher(
    () => apiService.get<{ canManage: boolean }>(SYNTHETICS_API_URLS.CLUSTER_SETTINGS_PRIVILEGES),
    []
  );

  return { canManage: data?.canManage === true, loading: Boolean(loading) };
};
