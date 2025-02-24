/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APMIndicesSavedObjectBody,
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '@kbn/apm-data-access-plugin/server/saved_objects/apm_indices';
import expect from '@kbn/expect';
import { ApmApiError } from '../../../common/apm_api_supertest';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function apmIndicesTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const kibanaServer = getService('kibanaServer');
  const apmApiClient = getService('apmApiClient');

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

  registry.when('[basic] APM Indices', { config: 'basic', archives: [] }, () => {
    beforeEach(async () => {
      await deleteSavedObject();
    });
    afterEach(async () => {
      await deleteSavedObject();
    });

    it('[basic] returns APM Indices', async () => {
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

    it('[basic] updates apm indices', async () => {
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

    it('[basic] updates apm indices removing legacy sourcemap', async () => {
      const INDEX_VALUE = 'foo-*';

      const writeResponse = await apmApiClient.writeUser({
        endpoint: 'POST /internal/apm/settings/apm-indices/save',
        params: {
          body: { sourcemap: 'bar-*', transaction: INDEX_VALUE },
        },
      });
      expect(writeResponse.status).to.be(200);
      const savedAPMSavedObject = writeResponse.body
        .attributes as Partial<APMIndicesSavedObjectBody>;
      expect(savedAPMSavedObject.apmIndices?.transaction).to.eql(INDEX_VALUE);
      expect(savedAPMSavedObject.apmIndices?.sourcemap).to.eql(undefined);

      const readResponse = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/settings/apm-indices',
      });
      expect(readResponse.body.transaction).to.eql(INDEX_VALUE);
      expect(readResponse.body.sourcemap).to.eql('apm-*');
    });
  });

  registry.when('[trial] APM Indices', { config: 'trial', archives: [] }, () => {
    // eslint-disable-next-line mocha/no-sibling-hooks
    beforeEach(async () => {
      await deleteSavedObject();
    });
    // eslint-disable-next-line mocha/no-sibling-hooks
    afterEach(async () => {
      await deleteSavedObject();
    });

    it('[trial] updates apm indices as read privileges with modify settings user', async () => {
      const INDEX_VALUE = 'foo-*';

      const writeResponse = await apmApiClient.apmReadPrivilegesWithWriteSettingsUser({
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

    it('[trial] fails to update apm indices as all privilege without modify settings', async () => {
      const INDEX_VALUE = 'foo-*';

      try {
        await apmApiClient.apmAllPrivilegesWithoutWriteSettingsUser({
          endpoint: 'POST /internal/apm/settings/apm-indices/save',
          params: {
            body: { transaction: INDEX_VALUE },
          },
        });
        expect(true).to.be(false);
      } catch (e) {
        const err = e as ApmApiError;
        expect(err.res.status).to.be(403);
      }
    });

    it('[trial] updates apm indices removing legacy sourcemap', async () => {
      const INDEX_VALUE = 'foo-*';

      const writeResponse = await apmApiClient.writeUser({
        endpoint: 'POST /internal/apm/settings/apm-indices/save',
        params: {
          body: { sourcemap: 'bar-*', transaction: INDEX_VALUE },
        },
      });
      expect(writeResponse.status).to.be(200);
      const savedAPMSavedObject = writeResponse.body
        .attributes as Partial<APMIndicesSavedObjectBody>;
      expect(savedAPMSavedObject.apmIndices?.transaction).to.eql(INDEX_VALUE);
      expect(savedAPMSavedObject.apmIndices?.sourcemap).to.eql(undefined);

      const readResponse = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/settings/apm-indices',
      });
      expect(readResponse.body.transaction).to.eql(INDEX_VALUE);
      expect(readResponse.body.sourcemap).to.eql('apm-*');
    });
  });
}
