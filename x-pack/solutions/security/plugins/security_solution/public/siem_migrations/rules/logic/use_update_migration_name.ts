/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { updateMigrationName } from '../api';
import * as i18n from './translations';

export const useUpdateMigrationName = () => {
  const { addError, addSuccess } = useAppToasts();
  return useMutation({
    mutationFn: updateMigrationName,
    onError: (error) => {
      addError(error, { title: i18n.UPDATE_MIGRATION_NAME_FAILURE });
    },
    onSuccess: () => {
      addSuccess(i18n.UPDATE_MIGRATION_NAME_SUCCESS);
    },
  });
};
