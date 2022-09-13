/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/fixtures/es_archiver/archives_metadata';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

type ServiceDetails = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'metrics_and_apm';

  const { start, end } = archives_metadata[archiveName];

  registry.when('When data is loaded', { config: 'basic', archives: ['metrics_and_apm'] }, () => {
    describe('fetch instance overview', () => {
      it('handles kubernetes metadata', async () => {
        let response: {
          status: number;
          body: ServiceOverviewInstanceDetails;
        };

        response = await apmApiClient.readUser({
          endpoint:
            'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
          params: {
            path: {
              serviceName: 'opbeans-java',
              serviceNodeName: '31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad',
            },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.kubernetes?.pod).to.eql({
          name: 'opbeans-java-5b5f75d696-5brrb',
          uid: '798f59e9-b1b2-11e9-9a96-42010a84004d',
        });
        expect(response.body.kubernetes?.deployment).to.eql(['opbeans-java']);
        expect(response.body.kubernetes?.namespace).to.eql(['default']);
        expect(response.body.kubernetes?.replicaset).to.eql(['opbeans-java-5b5f75d696']);
      });

      it('handles empty infra metrics data', async () => {
        let response: {
          status: number;
          body: ServiceOverviewInstanceDetails;
        };

        response = await apmApiClient.readUser({
          endpoint:
            'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
          params: {
            path: {
              serviceName: 'opbeans-go',
              serviceNodeName: '05c94267b32ffc8bead290e194e9703d206a52839b6b7b3fa4045595f545ef10',
            },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.kubernetes?.pod).to.eql({
          name: 'opbeans-go-65dd88695-hfrtv',
          uid: '4c91b856-42c0-4db8-a352-f857fd1bd286',
        });
        expect(response.body.kubernetes?.deployment).to.eql([]);
        expect(response.body.kubernetes?.namespace).to.eql([]);
        expect(response.body.kubernetes?.replicaset).to.eql([]);
      });
    });

    describe('fetch service metadata details', () => {
      it('handles service with multiple kubernetes instances ', async () => {
        let response: {
          status: number;
          body: ServiceDetails;
        };

        response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
          params: {
            path: {
              serviceName: 'opbeans-java',
            },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.kubernetes?.deployment).to.eql(['opbeans-java', 'opbeans-java-2']);
        expect(response.body.kubernetes?.namespace).to.eql(['default']);
        expect(response.body.kubernetes?.replicaset).to.eql([
          'opbeans-java-5b5f75d696',
          'opbeans-java-5b5f75d697',
        ]);
      });

      it('handles partial infra metrics data', async () => {
        let response: {
          status: number;
          body: ServiceDetails;
        };

        response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
          params: {
            path: {
              serviceName: 'opbeans-node',
            },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.container?.image).to.eql(
          'docker.elastic.co/observability-ci/opbeans-node@sha256:f72b0bfdd0ca24e4f9d10ee73cf713a591dbfa40f1fe9404b04e6f2f3e166949'
        );
        expect(response.body.kubernetes?.deployment).to.eql([]);
        expect(response.body.kubernetes?.namespace).to.eql([]);
        expect(response.body.kubernetes?.replicaset).to.eql([]);
      });

      it('handles empty infra metrics data', async () => {
        let response: {
          status: number;
          body: ServiceDetails;
        };

        response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
          params: {
            path: {
              serviceName: 'opbeans-ruby',
            },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.kubernetes?.deployment).to.eql([]);
        expect(response.body.kubernetes?.namespace).to.eql([]);
        expect(response.body.kubernetes?.replicaset).to.eql([]);
      });
    });
  });
}
