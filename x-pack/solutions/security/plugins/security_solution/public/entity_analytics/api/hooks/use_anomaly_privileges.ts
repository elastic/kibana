/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useQuery } from '@kbn/react-query';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';
import { USE_FACELIFT_MOCK_FLYOUT } from '../../components/home/facelift/flyout_data';

export const ANOMALY_PRIVILEGES_QUERY_KEY = 'anomaly-privileges';

const FACELIFT_MOCK_ANOMALY_PRIVILEGES: EntityAnalyticsPrivileges = {
  has_all_required: true,
  privileges: {
    elasticsearch: {
      cluster: {},
      index: {},
    },
    kibana: {},
  },
};

export const useAnomalyPrivileges = (enabled = true) => {
  const { fetchAnomalyPrivileges } = useEntityAnalyticsRoutes();
  const query = useQuery<EntityAnalyticsPrivileges, SecurityAppError>({
    queryKey: [ANOMALY_PRIVILEGES_QUERY_KEY],
    queryFn: fetchAnomalyPrivileges,
    enabled: enabled && !USE_FACELIFT_MOCK_FLYOUT,
    retry: 0,
  });

  return useMemo(() => {
    if (!USE_FACELIFT_MOCK_FLYOUT || !enabled) {
      return query;
    }
    return {
      ...query,
      data: FACELIFT_MOCK_ANOMALY_PRIVILEGES,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'success' as const,
    };
  }, [enabled, query]);
};
