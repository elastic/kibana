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
        const response = await apmApiClient.readUser({
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

        const body: ServiceOverviewInstanceDetails = response.body;
        const status: number = response.status;

        expect(status).to.be(200);
        expect(body.kubernetes?.pod).to.eql({
          name: 'opbeans-java-5b5f75d696-5brrb',
          uid: '798f59e9-b1b2-11e9-9a96-42010a84004d',
        });
        expect(body.kubernetes?.deployment).to.eql(['opbeans-java']);
        expect(body.kubernetes?.namespace).to.eql(['default']);
        expect(body.kubernetes?.replicaset).to.eql(['opbeans-java-5b5f75d696']);
      });

      it('handles empty infra metrics data', async () => {
        const response = await apmApiClient.readUser({
          endpoint:
            'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
          params: {
            path: {
              serviceName: 'opbeans-node',
              serviceNodeName: '768120daead4526f5ba3ec583e0b081a19a525843aa5632a5e0b1de3a367f52d',
            },
            query: {
              start,
              end,
            },
          },
        });

        const body: ServiceOverviewInstanceDetails = response.body;
        const status: number = response.status;

        expect(status).to.be(200);
        expect(body.kubernetes?.pod).to.eql({
          name: null,
          uid: null,
        });
        expect(body.kubernetes?.deployment).to.eql([]);
        expect(body.kubernetes?.namespace).to.eql([]);
        expect(body.kubernetes?.replicaset).to.eql([]);
      });
    });

    describe('fetch service metadata details', () => {
      it('handles service with multiple kubernetes instances ', async () => {
        const response = await apmApiClient.readUser({
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

        const body: ServiceDetails = response.body;
        const status: number = response.status;

        expect(status).to.be(200);
        expect(body.kubernetes?.deployment).to.eql(['opbeans-java', 'opbeans-java-2']);
        expect(body.kubernetes?.namespace).to.eql(['default']);
        expect(body.kubernetes?.replicaset).to.eql([
          'opbeans-java-5b5f75d696',
          'opbeans-java-5b5f75d697',
        ]);
      });

      it('handles partial infra metrics data', async () => {
        const response = await apmApiClient.readUser({
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

        const body: ServiceDetails = response.body;
        const status: number = response.status;

        expect(status).to.be(200);
        expect(body.container?.image).to.eql(
          'docker.elastic.co/observability-ci/opbeans-node@sha256:f72b0bfdd0ca24e4f9d10ee73cf713a591dbfa40f1fe9404b04e6f2f3e166949'
        );
        expect(body.kubernetes?.deployment).to.eql([]);
        expect(body.kubernetes?.namespace).to.eql([]);
        expect(body.kubernetes?.replicaset).to.eql([]);
      });

      it('handles empty infra metrics data', async () => {
        const response = await apmApiClient.readUser({
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

        const body: ServiceDetails = response.body;
        const status: number = response.status;

        expect(body.kubernetes?.pod).to.eql({
          name: null,
          uid: null,
        });
        expect(status).to.be(200);
        expect(body.kubernetes?.deployment).to.eql([]);
        expect(body.kubernetes?.namespace).to.eql([]);
        expect(body.kubernetes?.replicaset).to.eql([]);
      });
    });
  });
}
