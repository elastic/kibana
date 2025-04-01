/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import archives_metadata from '../../../../../../../apm_api_integration/common/fixtures/es_archiver/archives_metadata';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../../constants/archiver';

type ServiceOverviewInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

type ServiceDetails = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const archiveName = 'infra_metrics_and_apm';
  const esArchiver = getService('esArchiver');

  const { start, end } = archives_metadata[archiveName];

  describe('Service infra metrics', () => {
    describe('When data is loaded', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES[archiveName]);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES[archiveName]);
      });

      describe('fetch service instance', () => {
        it('handles empty infra metrics data for a service node', async () => {
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

          expect(body.kubernetes?.pod).to.eql({});
          expect(body.kubernetes?.deployment).to.eql({});
          expect(body.kubernetes?.replicaset).to.eql({});
          expect(body.kubernetes?.container).to.eql({});
        });

        it('handles kubernetes metadata for a service node', async () => {
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

          expect(body.kubernetes?.deployment?.name).to.eql('opbeans-java');
          expect(body.kubernetes?.pod?.name).to.eql('opbeans-java-5b5f75d696-5brrb');
          expect(body.kubernetes?.pod?.uid).to.eql('798f59e9-b1b2-11e9-9a96-42010a84004d');
          expect(body.kubernetes?.namespace).to.eql('default');
          expect(body.kubernetes?.replicaset?.name).to.eql('opbeans-java-5b5f75d696');
          expect(body.kubernetes?.container?.name).to.eql('opbeans-java');
        });
      });

      describe('fetch service overview metadata details', () => {
        it('handles service overview metadata with multiple kubernetes instances', async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
            params: {
              path: {
                serviceName: 'opbeans-java',
              },
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
              },
            },
          });

          const body: ServiceDetails = response.body;
          const status: number = response.status;

          expect(status).to.be(200);
          expect(body.kubernetes?.deployments).to.eql(['opbeans-java', 'opbeans-java-2']);
          expect(body.kubernetes?.namespaces).to.eql(['default']);
          expect(body.kubernetes?.containerImages).to.eql([
            'docker.elastic.co/observability-ci/opbeans-java@sha256:dda30dbabe5c43b8bcd62b48a727f04e9d17147443ea3b3ac2edfc44cb0e69fe',
            'mysql@sha256:c8f03238ca1783d25af320877f063a36dbfce0daa56a7b4955e6c6e05ab5c70b',
          ]);
          expect(body.kubernetes?.replicasets).to.eql([
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
                environment: ENVIRONMENT_ALL.value,
              },
            },
          });

          const body: ServiceDetails = response.body;
          const status: number = response.status;

          expect(status).to.be(200);
          expect(body.kubernetes?.containerImages).to.eql([
            'docker.elastic.co/observability-ci/opbeans-node@sha256:f72b0bfdd0ca24e4f9d10ee73cf713a591dbfa40f1fe9404b04e6f2f3e166949',
            'k8s.gcr.io/pause:3.1',
          ]);
          expect(body.kubernetes?.deployments).to.eql([]);
          expect(body.kubernetes?.namespaces).to.eql([]);
          expect(body.kubernetes?.replicasets).to.eql([]);
        });

        it('handles empty infra metrics data', async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
            params: {
              path: {
                serviceName: 'opbeans-ruby',
              },
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
              },
            },
          });

          const body: ServiceDetails = response.body;
          const status: number = response.status;

          expect(status).to.be(200);
          expect(body.kubernetes?.containerImages).to.eql([]);
          expect(body.kubernetes?.namespaces).to.eql([]);
          expect(body.kubernetes?.namespaces).to.eql([]);
          expect(body.kubernetes?.replicasets).to.eql([]);
        });
      });
    });
  });
}
