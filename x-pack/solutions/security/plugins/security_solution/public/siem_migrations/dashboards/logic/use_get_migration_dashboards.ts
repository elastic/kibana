/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useCallback } from 'react';
import type { SiemMigrationFilters } from '../../../../common/siem_migrations/types';
import { SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH } from '../../../../common/siem_migrations/dashboards/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { getMigrationDashboards } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const useGetMigrationDashboards = (params: {
  migrationId: string;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: SiemMigrationFilters;
}) => {
  const { addError } = useAppToasts();

  const { migrationId } = params;
  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
    migration_id: migrationId,
  });

  return useQuery(
    ['GET', SPECIFIC_MIGRATION_PATH, params],
    async ({ signal }) => {
      const response = await getMigrationDashboards({ signal, ...params });

      return { migrationDashboards: response.data, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_DASHBOARDS_FAILURE });
      },
      cacheTime: 2 * 1000,
    }
  );
};

/**
 * We should use this hook to invalidate the dashboard migrations cache. For
 * example, dashboard migrations mutations, like installing a dashboard, should lead to cache invalidation.
 *
 * @returns A dashboard migrations cache invalidation callback
 */
export const useInvalidateGetMigrationDashboards = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (migrationId: string) => {
      const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
        migration_id: migrationId,
      });

      /**
       * Invalidate all queries that start with SPECIFIC_MIGRATION_PATH. This
       * includes the in-memory query cache and paged query cache.
       */
      queryClient.invalidateQueries(['GET', SPECIFIC_MIGRATION_PATH], {
        refetchType: 'active',
      });
    },
    [queryClient]
  );
};
