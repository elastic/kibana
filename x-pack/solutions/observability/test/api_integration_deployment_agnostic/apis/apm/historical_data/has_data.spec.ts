/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import moment from 'moment';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');
  const synthtrace = getService('synthtrace');

  describe('Historical data ', () => {
    describe('when there is not data', () => {
      it('returns hasData=false', async () => {
        const response = await apmApiClient.readUser({ endpoint: `GET /internal/apm/has_data` });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.be(false);
      });
    });

    describe('when there is data', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const start = moment().subtract(30, 'minutes').valueOf();
        const end = moment().valueOf();

        const serviceInstance = apm
          .service({ name: 'my-go-service', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        const documents = [
          timerange(start, end)
            .interval('1m')
            .generator((timestamp) =>
              serviceInstance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(10)
            ),
        ];

        await apmSynthtraceEsClient.index(documents);
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns hasData=true', async () => {
        const response = await apmApiClient.readUser({ endpoint: `GET /internal/apm/has_data` });
        expect(response.status).to.be(200);
        expect(response.body.hasData).to.be(true);
      });

      it('answers from the recent-data phase without running the fallback', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/has_data`,
          params: { query: { _inspect: true } },
        });

        expect(status).to.be(200);
        expect(body.hasData).to.be(true);
        // One ES call means the recent-data phase matched and short-circuited.
        expect(body._inspect).to.have.length(1);
      });
    });

    // The esArchiver fixture is timestamped outside the recent-data window, so
    // only the unbounded fallback can answer it.
    describe('when only old data is loaded', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });

      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('returns hasData=true from the unbounded fallback', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/has_data`,
          params: { query: { _inspect: true } },
        });

        expect(status).to.be(200);
        expect(body.hasData).to.be(true);
        expect(body._inspect).to.have.length(2);
      });
    });
  });
}
