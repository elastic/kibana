/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  describe('has data', () => {
    describe('when no data is loaded', () => {
      it('returns false when there is no data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(false);
      });
    });

    describe('when only onboarding data is loaded', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES.observability_overview);
      });

      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES.observability_overview);
      });

      it('returns false when there is only onboarding data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(false);
      });
    });

    describe('when data is loaded', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('returns true when there is at least one document on transaction, error or metrics indices', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
        });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.eql(true);
      });
    });
  });
}
