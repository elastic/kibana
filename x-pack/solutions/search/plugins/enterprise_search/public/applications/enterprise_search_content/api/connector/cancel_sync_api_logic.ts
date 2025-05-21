/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CancelSyncApiArgs {
  syncJobId: string;
}

export interface CancelSyncApiResponse {
  success: boolean;
}

export const cancelSync = async ({ syncJobId }: CancelSyncApiArgs) => {
  const route = `/internal/enterprise_search/connectors/${syncJobId}/cancel_sync`;
  return await HttpLogic.values.http.put(route);
};

export const CancelSyncApiLogic = createApiLogic(['cancel_sync_api_logic'], cancelSync, {
  showErrorFlash: true,
  showSuccessFlashFn: () =>
    i18n.translate('xpack.enterpriseSearch.content.searchIndex.cancelSync.successMessage', {
      defaultMessage: 'Successfully canceled sync',
    }),
});

export type CancelSyncApiActions = Actions<CancelSyncApiArgs, CancelSyncApiResponse>;
