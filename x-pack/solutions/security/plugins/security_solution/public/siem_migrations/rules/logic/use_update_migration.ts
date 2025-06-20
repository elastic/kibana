/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { UpdateRuleMigrationRequestBody } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { updateMigration } from '../api';
import * as i18n from './translations';

export interface UseUpdateMigrationNameProps {
  onError?: (error: Error) => void;
}

export const useUpdateMigration = (
  migrationId: string,
  { onError }: UseUpdateMigrationNameProps = {}
) => {
  const { addError, addSuccess } = useAppToasts();
  return useMutation({
    mutationFn: (body: UpdateRuleMigrationRequestBody) => updateMigration({ migrationId, body }),
    onError: (error: Error) => {
      addError(error, { title: i18n.UPDATE_MIGRATION_NAME_FAILURE });
      onError?.(error);
    },
    onSuccess: () => {
      addSuccess(i18n.UPDATE_MIGRATION_NAME_SUCCESS);
    },
  });
};
