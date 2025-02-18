/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '@kbn/apm-data-access-plugin/server/saved_objects/apm_indices';
import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export default function apmIndicesTests({ getService }: DeploymentAgnosticFtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const apmApiClient = getService('apmApi');

  async function deleteSavedObject() {
    try {
      return await kibanaServer.savedObjects.delete({
        type: APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
        id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
      });
    } catch (e) {
      if (e.response.status !== 404) {
        throw e;
      }
    }
  }

  describe('APM Indices', () => {
    beforeEach(async () => {
      await deleteSavedObject();
    });

    afterEach(async () => {
      await deleteSavedObject();
    });

    it('returns APM Indices', async () => {
      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/settings/apm-indices',
      });
      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        transaction: 'traces-apm*,apm-*,traces-*.otel-*',
        span: 'traces-apm*,apm-*,traces-*.otel-*',
        error: 'logs-apm*,apm-*,logs-*.otel-*',
        metric: 'metrics-apm*,apm-*,metrics-*.otel-*',
        onboarding: 'apm-*',
        sourcemap: 'apm-*',
      });
    });

    it('updates apm indices', async () => {
      const INDEX_VALUE = 'foo-*';

      const writeResponse = await apmApiClient.writeUser({
        endpoint: 'POST /internal/apm/settings/apm-indices/save',
        params: {
          body: { transaction: INDEX_VALUE },
        },
      });
      expect(writeResponse.status).to.be(200);

      const readResponse = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/settings/apm-indices',
      });

      expect(readResponse.status).to.be(200);
      expect(readResponse.body.transaction).to.eql(INDEX_VALUE);
    });
  });
}
