/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createConnector as _createConnector_,
  deleteConnector as _deleteConnector_,
  deleteAllConnectors as _deleteAllConnectors_,
} from '../../../common/utils/connectors';

export function ActionsAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');
  const log = getService('log');

  return {
    async createConnector({
      name,
      config,
      secrets,
      connectorTypeId,
    }: {
      name: string;
      config: Record<string, unknown>;
      secrets: Record<string, unknown>;
      connectorTypeId: string;
      additionalRequestHeaders?: object;
    }): Promise<string> {
      return await _createConnector_(kbnSupertest, {
        name,
        connector_type_id: connectorTypeId,
        config,
        secrets,
      });
    },

    async deleteConnector(id: string) {
      log.debug(`Deleting connector with id '${id}'...`);

      const response = await _deleteConnector_(kbnSupertest, id).expect(204, '');

      log.debug('> Connector deleted.');

      return response;
    },

    async deleteAllConnectors() {
      await _deleteAllConnectors_(kbnSupertest);
    },
  };
}
