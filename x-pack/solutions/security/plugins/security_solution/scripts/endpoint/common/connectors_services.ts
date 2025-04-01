/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { AllConnectorsResponseV1 } from '@kbn/actions-plugin/common/routes/connector/response';
import type { CreateConnectorRequestBodyV1 } from '@kbn/actions-plugin/common/routes/connector/apis/create';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';

/**
 * Retrieve list of configured Connectors
 * @param kbnClient
 */
export const fetchConnectorsList = async (
  kbnClient: KbnClient
): Promise<AllConnectorsResponseV1[]> => {
  return kbnClient
    .request<AllConnectorsResponseV1[]>({
      path: '/api/actions/connectors',
      method: 'GET',
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

/**
 * Returns the first connector instance (if any) of a given type
 * @param kbnClient
 * @param connectorTypeId
 */
export const fetchConnectorByType = async (
  kbnClient: KbnClient,
  connectorTypeId: string
): Promise<AllConnectorsResponseV1 | undefined> => {
  const allConnectors = await fetchConnectorsList(kbnClient);

  for (const connector of allConnectors) {
    if (connector.connector_type_id === connectorTypeId) {
      return connector;
    }
  }
};

/**
 * Creates a connector in the stack
 * @param kbnClient
 * @param createPayload
 */
export const createConnector = async (
  kbnClient: KbnClient,
  createPayload: CreateConnectorRequestBodyV1
): Promise<Connector> => {
  return kbnClient
    .request<Connector>({
      path: '/api/actions/connector',
      method: 'POST',
      body: createPayload,
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};
