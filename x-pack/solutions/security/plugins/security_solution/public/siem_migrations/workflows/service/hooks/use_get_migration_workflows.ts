/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getWorkflowMigrationWorkflows } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import * as i18n from './translations';

const getQueryKey = (migrationId: string) => [
  'GET',
  replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, { migration_id: migrationId }),
];

export const useGetMigrationWorkflows = (params: {
  migrationId: string;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: SiemMigrationFilters;
}) => {
  const { addError } = useAppToasts();

  return useQuery(
    [...getQueryKey(params.migrationId), params],
    async ({ signal }) => {
      const response = await getWorkflowMigrationWorkflows({ signal, ...params });
      return { migrationWorkflows: response.data, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_WORKFLOWS_FAILURE });
      },
      cacheTime: 2 * 1000,
    }
  );
};
