/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction trace samples response structure when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct samples', async () => {
        const traceId = '10d882b7118870015815a27c37892375';
        const transactionId = '0cf9db0b1e321239';

        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              transactionName: 'APIRestController#stats',
              kuery: '',
              traceId,
              transactionId,
            },
          },
        });

        const { traceSamples } = response.body;

        expect(response.status).to.be(200);

        expect(traceSamples.some((sample) => sample.score! > 0)).to.be(true);

        expect(traceSamples[0].traceId).to.eql(traceId);
        expect(traceSamples[0].transactionId).to.eql(transactionId);

        expect(response.body.traceSamples.length).to.eql(15);
      });
    }
  );
}
