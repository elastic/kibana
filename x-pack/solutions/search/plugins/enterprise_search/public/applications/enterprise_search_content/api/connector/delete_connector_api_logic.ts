/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { DeleteConnectorResponse } from '../../../../../common/types/connectors';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface DeleteConnectorApiLogicArgs {
  connectorId: string;
  connectorName: string;
  shouldDeleteIndex: boolean;
}

export interface DeleteConnectorApiLogicResponse {
  connectorName: string;
}

export const deleteConnector = async ({
  connectorId,
  connectorName,
  shouldDeleteIndex = false,
}: DeleteConnectorApiLogicArgs): Promise<DeleteConnectorApiLogicResponse> => {
  await HttpLogic.values.http.delete(`/internal/enterprise_search/connectors/${connectorId}`, {
    query: {
      shouldDeleteIndex,
    },
  });
  return { connectorName };
};

export const DeleteConnectorApiLogic = createApiLogic(
  ['delete_connector_api_logic'],
  deleteConnector,
  {
    showSuccessFlashFn: ({ connectorName }) =>
      i18n.translate(
        'xpack.enterpriseSearch.content.connectors.deleteConnector.successToast.title',
        {
          defaultMessage: 'The connector {connectorName} was successfully deleted',
          values: {
            connectorName,
          },
        }
      ),
  }
);

export type DeleteConnectorApiLogicActions = Actions<
  DeleteConnectorApiLogicArgs,
  DeleteConnectorResponse
>;
