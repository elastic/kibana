/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getServiceNodeIds } from './get_service_node_ids';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');

  const start = '2023-08-22T00:00:00.000Z';
  const end = '2023-08-22T01:00:00.000Z';

  registry.when(
    'Instance details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
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
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177494
  registry.when('Instance details when data is loaded', { config: 'basic', archives: [] }, () => {
    const range = timerange(new Date(start).getTime(), new Date(end).getTime());

    const serviceInstance = apm
      .service({ name: 'service1', environment: 'production', agentName: 'go' })
      .instance('multiple-env-service-production');

    const metricOnlyInstance = apm
      .service({ name: 'service1', environment: 'production', agentName: 'java' })
      .instance('multiple-env-service-production');

    before(async () => {
      return synthtrace.index([
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

    after(() => {
      return synthtrace.clean();
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
        expectSnapshot(omit(response.body, '@timestamp')).toMatch();
      });
    });
  });

  registry.when(
    'Instance details when data is loaded but details not found',
    { config: 'basic', archives: [] },
    () => {
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
    }
  );
}
