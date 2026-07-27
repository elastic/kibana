/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import { useCallback } from 'react';
import { SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH } from '../../../../common/siem_migrations/workflows/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { getMigrationWorkflows } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const useGetMigrationWorkflows = (params: {
  migrationId: string;
  page?: number;
  perPage?: number;
  searchTerm?: string;
}) => {
  const { addError } = useAppToasts();

  const { migrationId } = params;
  const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, {
    migration_id: migrationId,
  });

  return useQuery(
    ['GET', SPECIFIC_MIGRATION_PATH, params],
    async ({ signal }) => {
      const response = await getMigrationWorkflows({ signal, ...params });

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

/**
 * Invalidate the migration workflows cache after mutations (e.g. save).
 */
export const useInvalidateGetMigrationWorkflows = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (migrationId: string) => {
      const SPECIFIC_MIGRATION_PATH = replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, {
        migration_id: migrationId,
      });

      queryClient.invalidateQueries(['GET', SPECIFIC_MIGRATION_PATH], {
        refetchType: 'active',
      });
    },
    [queryClient]
  );
};
