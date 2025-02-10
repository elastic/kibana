/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH } from '../../../../common/siem_migrations/constants';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { getRuleMigrationMissingPrivileges } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const useGetMigrationMissingPrivileges = () => {
  const { addError } = useAppToasts();
  return useQuery(
    ['GET', SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH],
    async ({ signal }) => getRuleMigrationMissingPrivileges({ signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_MIGRATION_RULES_FAILURE });
      },
    }
  );
};

/**
 * We should use this hook to invalidate the migration privileges cache.
 * @returns A migration privileges cache invalidation callback
 */
export const useInvalidateGetMigrationPrivileges = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries(['GET', SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH], {
      refetchType: 'active',
    });
  }, [queryClient]);
};
