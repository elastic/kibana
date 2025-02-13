/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface StartAccessControlSyncArgs {
  connectorId: string;
}

export const startAccessControlSync = async ({ connectorId }: StartAccessControlSyncArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/start_access_control_sync`;
  return await HttpLogic.values.http.post(route);
};

export const StartAccessControlSyncApiLogic = createApiLogic(
  ['start_access_control_sync_api_logic'],
  startAccessControlSync,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.index.accessControlSyncSuccess.message',
        {
          defaultMessage:
            'Successfully scheduled an access control sync, waiting for a connector to pick it up',
        }
      ),
  }
);
