/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function ActionsAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');
  const log = getService('log');

  return {
    async createConnector({
      name,
      config,
      secrets,
      connectorTypeId,
      additionalRequestHeaders,
    }: {
      name: string;
      config: Record<string, unknown>;
      secrets: Record<string, unknown>;
      connectorTypeId: string;
      additionalRequestHeaders?: object;
    }) {
      const { body: createdAction } = await kbnSupertest
        .post(`/api/actions/connector`)
        .set({ ...additionalRequestHeaders, 'kbn-xsrf': 'foo' })
        .send({
          name,
          config,
          secrets,
          connector_type_id: connectorTypeId,
        })
        .expect(200);

      return createdAction;
    },

    async deleteConnector(id: string, additionalRequestHeaders?: object) {
      log.debug(`Deleting connector with id '${id}'...`);
      const rsp = kbnSupertest
        .delete(`/api/actions/connector/${id}`)
        .set({ ...additionalRequestHeaders, 'kbn-xsrf': 'foo' })
        .expect(204, '');
      log.debug('> Connector deleted.');
      return rsp;
    },

    async deleteAllConnectors(additionalRequestHeaders?: object) {
      const { body } = await kbnSupertest
        .get(`/api/actions/connectors`)
        .set({ ...additionalRequestHeaders, 'kbn-xsrf': 'foo' })
        .expect(200);

      for (const connector of body) {
        await this.deleteConnector(connector.id, additionalRequestHeaders);
      }
    },
  };
}
