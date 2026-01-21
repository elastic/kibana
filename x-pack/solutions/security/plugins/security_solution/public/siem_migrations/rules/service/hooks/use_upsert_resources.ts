/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import type { UpsertRuleMigrationResourcesRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { reducer, initialState } from '../../../common/service';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/types';

export const RULES_DATA_INPUT_UPSERT_MIGRATION_RESOURCES_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.service.upsertRuleMigrationResourcesError',
  { defaultMessage: 'Failed to upload rule migration resources' }
);

export type UpsertResources = ({
  migrationId,
  vendor,
  data,
}: {
  migrationId: string;
  vendor?: SiemMigrationVendor;
  data: UpsertRuleMigrationResourcesRequestBody;
}) => void;
export type OnSuccess = (data: UpsertRuleMigrationResourcesRequestBody) => void;

export const useUpsertResources = (onSuccess: OnSuccess) => {
  const { siemMigrations, notifications } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const upsertResources = useCallback<UpsertResources>(
    ({ migrationId, vendor, data }) => {
      (async () => {
        try {
          dispatch({ type: 'start' });
          await siemMigrations.rules.upsertMigrationResources({
            migrationId,
            vendor,
            body: data,
          });

          onSuccess(data);
          dispatch({ type: 'success' });
        } catch (err) {
          const apiError = err.body ?? err;
          notifications.toasts.addError(apiError, {
            title: RULES_DATA_INPUT_UPSERT_MIGRATION_RESOURCES_ERROR,
          });
          dispatch({ type: 'error', error: apiError });
        }
      })();
    },
    [siemMigrations.rules, notifications.toasts, onSuccess]
  );

  return { isLoading: state.loading, error: state.error, upsertResources };
};
