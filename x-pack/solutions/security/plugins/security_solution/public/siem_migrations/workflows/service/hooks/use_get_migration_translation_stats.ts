/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import type { GetWorkflowMigrationTranslationStatsResponse } from '../../../../../common/siem_migrations/workflows/types';
import { SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getWorkflowMigrationTranslationStats } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import * as i18n from './translations';

const getQueryKey = (migrationId: string) => [
  'GET',
  replaceParams(SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH, { migration_id: migrationId }),
];

/** The translation stats are not returned (204) while the migration has no workflows */
export const useGetMigrationTranslationStats = (migrationId: string) => {
  const { addError } = useAppToasts();

  return useQuery<GetWorkflowMigrationTranslationStatsResponse | undefined>(
    getQueryKey(migrationId),
    ({ signal }) => getWorkflowMigrationTranslationStats({ migrationId, signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_TRANSLATION_STATS_FAILURE });
      },
      cacheTime: 2 * 1000,
    }
  );
};
