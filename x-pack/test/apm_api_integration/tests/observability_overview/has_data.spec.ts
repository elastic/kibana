/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  registry.when(
    'Observability overview when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('returns false when there is no data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(false);
      });
    }
  );

  registry.when(
    'Observability overview when only onboarding data is loaded',
    { config: 'basic', archives: ['observability_overview'] },
    () => {
      it('returns false when there is only onboarding data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(false);
      });
    }
  );

  registry.when(
    'Observability overview when APM data is loaded',
    { config: 'basic', archives: ['apm_8.0.0'] },
    () => {
      it('returns true when there is at least one document on transaction, error or metrics indices', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(true);
      });
    }
  );
}
