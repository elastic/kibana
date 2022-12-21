/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { getServiceNodeIds } from './get_service_node_ids';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

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

  // FLAKY: https://github.com/elastic/kibana/issues/120056
  registry.when.skip(
    'Instance details when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe.skip('fetch instance details', () => {
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
          });

          response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
            params: {
              path: { serviceName: 'opbeans-node', serviceNodeName: serviceNodeIds[0] },
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
    }
  );

  registry.when(
    'Instance details when data is loaded but details not found',
    { config: 'basic', archives: [archiveName] },
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
