/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');
  const synthtrace = getService('synthtrace');

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

    // The cases above load old esArchiver fixtures, which the probe's recent-data
    // phase cannot match, so they are all answered by the unbounded fallback.
    // Without a near-now dataset the fast path is never exercised against a real
    // Elasticsearch, and a `range`/`_tier` clause that silently matched nothing
    // would still leave every assertion above green.
    describe('when recent data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      const end = Date.now();
      const start = end - 15 * 60 * 1000;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const instance = apm
          .service({ name: 'synth-recent', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /recent' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns true from the recent-data phase without running the fallback', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/observability_overview/has_data',
          params: { query: { _inspect: true } },
        });

        expect(status).to.be(200);
        expect(body.hasData).to.eql(true);
        // Exactly one Elasticsearch call proves the recent-data phase matched and
        // short-circuited; a second would mean it missed and the unbounded
        // fallback produced the answer.
        expect(body._inspect).to.have.length(1);
      });
    });
  });
}
