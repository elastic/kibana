/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function ActionsAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');

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
    }) {
      const { body: createdAction } = await kbnSupertest
        .post(`/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name,
          config,
          secrets,
          connector_type_id: connectorTypeId,
        })
        .expect(200);

      return createdAction;
    },

    async deleteConnector(id: string) {
      return kbnSupertest
        .delete(`/api/actions/connector/${id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    },
  };
}
