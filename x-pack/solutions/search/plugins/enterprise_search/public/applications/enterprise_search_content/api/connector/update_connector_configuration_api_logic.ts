/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ConnectorConfiguration } from '@kbn/search-connectors';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PostConnectorConfigurationArgs {
  configuration: Record<string, string | number | boolean | null>;
  connectorId: string;
}

export interface PostConnectorConfigurationResponse {
  configuration: ConnectorConfiguration;
}

export const postConnectorConfiguration = async ({
  configuration,
  connectorId,
}: PostConnectorConfigurationArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/configuration`;

  const responseConfig = await HttpLogic.values.http.post<ConnectorConfiguration>(route, {
    body: JSON.stringify(configuration),
  });
  return { configuration: responseConfig };
};

export const ConnectorConfigurationApiLogic = createApiLogic(
  ['content', 'configuration_connector_api_logic'],
  postConnectorConfiguration,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.configuration.successToast.title',
        { defaultMessage: 'Configuration updated' }
      ),
  }
);

export type PostConnectorConfigurationActions = Actions<
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse
>;
