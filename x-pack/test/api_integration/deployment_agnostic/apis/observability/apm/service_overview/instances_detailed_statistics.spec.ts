/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getServiceNodeIds } from './get_service_node_ids';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  const serviceName = 'opbeans-java';

  const { start, end } = {
    start: '2021-08-03T06:50:15.910Z',
    end: '2021-08-03T07:20:15.910Z',
  };

  describe('Service Overview', () => {
    describe('Instances detailed statistics', () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
            params: {
              path: { serviceName },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                numBuckets: 20,
                transactionType: 'request',
                serviceNodeIds: JSON.stringify(
                  await getServiceNodeIds({ apmApiClient, start, end })
                ),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
        });
      });

      // UNSUPPORTED TEST CASES - when data is loaded
      // TODO: These tests should be migrated to use synthtrace: https://github.com/elastic/kibana/issues/200743
    });
  });
}
