/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { SchedulingConfiguraton } from '@kbn/search-connectors';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface UpdateConnectorSchedulingArgs {
  connectorId: string;
  scheduling: SchedulingConfiguraton;
}

export const updateConnectorScheduling = async ({
  connectorId,
  scheduling,
}: UpdateConnectorSchedulingArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/scheduling`;

  await HttpLogic.values.http.post<undefined>(route, {
    body: JSON.stringify(scheduling),
  });
  return scheduling;
};

export const UpdateConnectorSchedulingApiLogic = createApiLogic(
  ['content', 'update_connector_scheduling_api_logic'],
  updateConnectorScheduling,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.scheduling.successToast.title',
        { defaultMessage: 'Scheduling successfully updated' }
      ),
  }
);
