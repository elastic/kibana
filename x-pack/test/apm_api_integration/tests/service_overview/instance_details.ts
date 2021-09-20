/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { getServiceNodeIds } from './get_service_node_ids';
import { createApmApiClient } from '../../common/apm_api_supertest';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');
  const apmApiSupertest = createApmApiClient(supertest);

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Instance details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles empty state', async () => {
          const response = await supertest.get(
            url.format({
              pathname: '/api/apm/services/opbeans-java/service_overview_instances/details/foo',
              query: {
                start,
                end,
              },
            })
          );

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

        let serviceNodeIds: string[];

        before(async () => {
          serviceNodeIds = await getServiceNodeIds({ apmApiSupertest, start, end });
          response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-java/service_overview_instances/details/${serviceNodeIds[0]}`,
              query: {
                start,
                end,
              },
            })
          );
        });

        it('returns the instance details', () => {
          expect(response.body).to.not.eql({});
        });

        it('return the correct data', () => {
          expectSnapshot(response.body).toMatch();
        });
      });
    }
  );

  registry.when(
    'Instance details when data is loaded but details not found',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('handles empty state when instance id not found', async () => {
        const response = await supertest.get(
          url.format({
            pathname: '/api/apm/services/opbeans-java/service_overview_instances/details/foo',
            query: {
              start,
              end,
            },
          })
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    }
  );
}
