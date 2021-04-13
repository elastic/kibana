/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';

type ServiceOverviewInstanceDetails = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Instance details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles empty state', async () => {
          const response = await apmApiSupertest({
            endpoint:
              'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
            params: {
              path: { serviceName: 'opbeans-java', serviceNodeName: 'foo' },
              query: {
                start,
                end,
                transactionType: 'request',
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body).to.eql({});
        });
      });
    }
  );

  registry.when(
    'Instance details when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetch instance details', () => {
        let response: {
          status: number;
          body: ServiceOverviewInstanceDetails;
        };

        before(async () => {
          response = await apmApiSupertest({
            endpoint:
              'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
            params: {
              path: {
                serviceName: 'opbeans-java',
                serviceNodeName: '02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c',
              },
              query: {
                start,
                end,
                transactionType: 'request',
              },
            },
          });
        });

        it('returns the instance details', () => {
          expect(response.body).to.not.eql({});
        });

        it('return the correct data', () => {
          expectSnapshot(response.body).toMatch();
        });
      });

      describe('handles empty state when instance id not found', async () => {
        const response = await apmApiSupertest({
          endpoint:
            'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
          params: {
            path: {
              serviceName: 'opbeans-java',
              serviceNodeName: 'foo',
            },
            query: {
              start,
              end,
              transactionType: 'request',
            },
          },
        });
        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    }
  );
}
