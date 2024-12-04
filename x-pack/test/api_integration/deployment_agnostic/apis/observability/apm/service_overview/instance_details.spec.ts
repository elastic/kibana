/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace/src/lib/apm/client/apm_synthtrace_es_client';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getServiceNodeIds } from './get_service_node_ids';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = '2023-08-22T00:00:00.000Z';
  const end = '2023-08-22T01:00:00.000Z';

  describe('Service Overview', () => {
    let client: ApmSynthtraceEsClient;

    before(async () => {
      client = await synthtrace.createApmSynthtraceEsClient();
    });

    describe('Instance details', () => {
      describe('when data is not loaded', () => {
        it('handles empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
            params: {
              path: { serviceName: 'opbeans-java', serviceNodeName: 'foo' },
              query: {
                start,
                end,
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body).to.eql({});
        });
      });

      describe('when data is loaded', () => {
        const range = timerange(new Date(start).getTime(), new Date(end).getTime());

        const serviceInstance = apm
          .service({ name: 'service1', environment: 'production', agentName: 'go' })
          .instance('multiple-env-service-production');

        const metricOnlyInstance = apm
          .service({ name: 'service1', environment: 'production', agentName: 'java' })
          .instance('multiple-env-service-production');

        before(() => {
          return client.index([
            range
              .interval('1s')
              .rate(4)
              .generator((timestamp) =>
                serviceInstance
                  .transaction({ transactionName: 'GET /api' })
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
              ),
            range
              .interval('30s')
              .rate(1)
              .generator((timestamp) =>
                metricOnlyInstance
                  .containerId('123')
                  .podId('234')
                  .appMetrics({
                    'system.memory.actual.free': 1,
                    'system.cpu.total.norm.pct': 1,
                    'system.memory.total': 1,
                    'system.process.cpu.total.norm.pct': 1,
                  })
                  .timestamp(timestamp)
              ),
          ]);
        });

        after(async () => {
          await client.clean();
        });

        describe('fetch instance details', () => {
          let response: {
            status: number;
            body: ServiceOverviewInstanceDetails;
          };

          let serviceNodeIds: string[];

          before(async () => {
            serviceNodeIds = await getServiceNodeIds({
              apmApiClient,
              start,
              end,
              serviceName: 'service1',
            });

            response = await apmApiClient.readUser({
              endpoint:
                'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
              params: {
                path: { serviceName: 'service1', serviceNodeName: serviceNodeIds[0] },
                query: {
                  start,
                  end,
                },
              },
            });
          });

          it('returns the instance details', () => {
            expect(response.body).to.not.eql({});
          });

          it('return the correct data', () => {
            expect(omit(response.body, '@timestamp')).to.eql({
              agent: {
                name: 'java',
              },
              container: {
                id: '123',
              },
              host: {
                name: 'multiple-env-service-production',
              },
              kubernetes: {
                container: {},
                deployment: {},
                pod: {
                  uid: '234',
                },
                replicaset: {},
              },
              service: {
                environment: 'production',
                name: 'service1',
                node: {
                  name: 'multiple-env-service-production',
                },
              },
            });
          });
        });
      });

      describe('when data is loaded but details not found', () => {
        it('handles empty state when instance id not found', async () => {
          const response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
            params: {
              path: { serviceName: 'opbeans-java', serviceNodeName: 'foo' },
              query: {
                start,
                end,
              },
            },
          });
          expect(response.status).to.be(200);
          expect(response.body).to.eql({});
        });
      });
    });
  });
}
