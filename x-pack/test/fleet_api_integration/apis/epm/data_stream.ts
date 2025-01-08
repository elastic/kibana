/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  describe('datastreams', () => {
    describe('standard integration', () => {
      const pkgName = 'datastreams';
      const pkgVersion = '0.1.0';
      const pkgUpdateVersion = '0.2.0';
      const logsTemplateName = `logs-${pkgName}.test_logs`;
      const metricsTemplateName = `metrics-${pkgName}.test_metrics`;
      const namespaces = ['default', 'foo', 'bar'];

      skipIfNoDockerRegistry(providerContext);

      before(async () => {
        await fleetAndAgents.setup();
      });

      const writeMetricsDoc = (namespace: string) =>
        es.transport.request(
          {
            method: 'POST',
            path: `/${metricsTemplateName}-${namespace}/_doc?refresh=true`,
            body: {
              '@timestamp': new Date().toISOString(),
              logs_test_name: 'test',
              data_stream: {
                dataset: `${pkgName}.test_metrics`,
                namespace,
                type: 'metrics',
              },
            },
          },
          { meta: true }
        );

      const writeLogsDoc = (namespace: string) =>
        es.transport.request(
          {
            method: 'POST',
            path: `/${logsTemplateName}-${namespace}/_doc?refresh=true`,
            body: {
              '@timestamp': new Date().toISOString(),
              logs_test_name: 'test',
              data_stream: {
                dataset: `${pkgName}.test_logs`,
                namespace,
                type: 'logs',
              },
            },
          },
          { meta: true }
        );
      beforeEach(async () => {
        await installPackage(pkgName, pkgVersion);
        await Promise.all(
          namespaces.map(async (namespace) => {
            return Promise.all([writeLogsDoc(namespace), writeMetricsDoc(namespace)]);
          })
        );
      });

      afterEach(async () => {
        await Promise.all(
          namespaces.map(async (namespace) => {
            const deleteLogsRequest = es.transport.request(
              {
                method: 'DELETE',
                path: `/_data_stream/${logsTemplateName}-${namespace}`,
              },
              { meta: true }
            );
            const deleteMetricsRequest = es.transport.request(
              {
                method: 'DELETE',
                path: `/_data_stream/${metricsTemplateName}-${namespace}`,
              },
              { meta: true }
            );
            return Promise.all([deleteLogsRequest, deleteMetricsRequest]);
          })
        );
        await uninstallPackage(pkgName, pkgVersion);
        await uninstallPackage(pkgName, pkgUpdateVersion);
      });

      describe('Data Streams endpoint', () => {
        it('Allows the fetching of data streams', async () => {
          const res = await supertest
            .get(`/api/fleet/epm/data_streams?uncategorisedOnly=false&datasetQuery=datastreams`)
            .expect(200);
          const dataStreams = res.body.items;
          expect(dataStreams.length).to.be(6);
        });
      });

      it('should list the logs and metrics datastream', async function () {
        await asyncForEach(namespaces, async (namespace) => {
          const resLogsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${logsTemplateName}-${namespace}`,
            },
            { meta: true }
          );
          const resMetricsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${metricsTemplateName}-${namespace}`,
            },
            { meta: true }
          );
          expect(resLogsDatastream.body.data_streams.length).equal(1);
          expect(resLogsDatastream.body.data_streams[0].indices.length).equal(1);
          expect(resMetricsDatastream.body.data_streams.length).equal(1);
          expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
        });
      });

      it('after update, it should have rolled over logs datastream because mappings are not compatible and not metrics', async function () {
        await installPackage(pkgName, pkgUpdateVersion);

        await asyncForEach(namespaces, async (namespace) => {
          // write doc as rollover is lazy
          await writeLogsDoc(namespace);
          await writeMetricsDoc(namespace);
          const resLogsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${logsTemplateName}-${namespace}`,
            },
            { meta: true }
          );
          const resMetricsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${metricsTemplateName}-${namespace}`,
            },
            { meta: true }
          );
          expect(resLogsDatastream.body.data_streams[0].indices.length).equal(2);
          expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
        });
      });

      it('should be able to upgrade a package after a rollover', async function () {
        await asyncForEach(namespaces, async (namespace) => {
          await es.transport.request<any>(
            {
              method: 'POST',
              path: `/${logsTemplateName}-${namespace}/_rollover`,
            },
            { meta: true }
          );
          const resLogsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${logsTemplateName}-${namespace}`,
            },
            { meta: true }
          );
          expect(resLogsDatastream.body.data_streams[0].indices.length).equal(2);
        });
        await installPackage(pkgName, pkgUpdateVersion);
      });

      describe('When enabling experimental data stream features', () => {
        let agentPolicyId: string;
        let packagePolicyId: string;

        let packagePolicyData: any;

        beforeEach(async () => {
          const { body: agentPolicyResponse } = await supertest
            .post(`/api/fleet/agent_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `Test policy ${uuidv4()}`,
              namespace: 'default',
            })
            .expect(200);
          agentPolicyId = agentPolicyResponse.item.id;
          packagePolicyData = {
            force: true,
            name: `test-package-experimental-feature-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [],
            package: {
              name: pkgName,
              version: pkgVersion,
            },
          };
          const { body: responseWithForce } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send(packagePolicyData)
            .expect(200);

          packagePolicyId = responseWithForce.item.id;
        });
        afterEach(async () => {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .send({
              agentPolicyId,
            })
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        });

        async function getLogsDefaultBackingIndicesLength() {
          const resLogsDatastream = await es.transport.request<any>(
            {
              method: 'GET',
              path: `/_data_stream/${logsTemplateName}-${namespaces[0]}`,
            },
            { meta: true }
          );

          return resLogsDatastream.body.data_streams[0].indices.length;
        }

        it('should rollover datstream after enabling a experimental datastream feature that need a rollover', async () => {
          expect(await getLogsDefaultBackingIndicesLength()).to.be(1);

          await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              ...packagePolicyData,
              package: {
                ...packagePolicyData.package,
                experimental_data_stream_features: [
                  {
                    data_stream: logsTemplateName,
                    features: {
                      synthetic_source: false,
                      tsdb: false,
                      doc_value_only_numeric: true,
                      doc_value_only_other: true,
                    },
                  },
                ],
              },
            })
            .expect(200);

          // Write a doc to trigger lazy rollover
          await writeLogsDoc('default');
          // Datastream should have been rolled over
          expect(await getLogsDefaultBackingIndicesLength()).to.be(2);
        });

        it('should allow updating a package policy with only a partial set of experimental datastream features', async () => {
          await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              ...packagePolicyData,
              package: {
                ...packagePolicyData.package,
                experimental_data_stream_features: [
                  {
                    data_stream: metricsTemplateName,
                    features: {
                      synthetic_source: true,
                    },
                  },
                ],
              },
            })
            .expect(200);
        });
      });
    });

    describe('tsdb integration', () => {
      const pkgName = 'no_tsdb_to_tsdb';
      const pkgVersion = '0.1.0';
      const pkgUpdateVersion = '0.2.0';
      const metricsTemplateName = `metrics-${pkgName}.test`;
      const namespace = 'default';

      skipIfNoDockerRegistry(providerContext);

      before(async () => {
        await fleetAndAgents.setup();
      });

      const writeMetricDoc = (body: any = {}) =>
        es.transport.request(
          {
            method: 'POST',
            path: `/${metricsTemplateName}-${namespace}/_doc?refresh=true`,
            body: {
              '@timestamp': new Date().toISOString(),
              logs_test_name: 'test',
              data_stream: {
                dataset: `${pkgName}.test_logs`,
                namespace,
                type: 'logs',
              },
              ...body,
            },
          },
          { meta: true }
        );
      beforeEach(async () => {
        await installPackage(pkgName, pkgVersion);

        // Create a sample document so the data stream is created
        await writeMetricDoc();
      });

      afterEach(async () => {
        await es.transport.request(
          {
            method: 'DELETE',
            path: `/_data_stream/${metricsTemplateName}-${namespace}`,
          },
          { meta: true }
        );

        await uninstallPackage(pkgName, pkgVersion);
      });

      it('rolls over data stream when index_mode: time_series is set in the updated package version', async () => {
        await installPackage(pkgName, pkgUpdateVersion);

        // Write a doc so lazy rollover can happen
        await writeMetricDoc({
          some_field: 'test',
        });
        const resMetricsDatastream = await es.transport.request<any>(
          {
            method: 'GET',
            path: `/_data_stream/${metricsTemplateName}-${namespace}`,
          },
          { meta: true }
        );

        expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(2);
      });
    });

    describe('dynamic template dimension', () => {
      const writeMetricDoc = (body: any = {}) =>
        es.transport.request(
          {
            method: 'POST',
            path: `/metrics-prometheus.remote_write-default/_doc?refresh=true`,
            body: {
              '@timestamp': new Date().toISOString(),
              prometheus: { labels: { test: 'label1' } },
              agent: {
                id: 'agent1',
              },
              cloud: {
                account: {
                  id: '1234',
                },
                availability_zone: 'eu',
                instance: {
                  id: '1234',
                },
                provider: 'aws',
                region: 'eu',
              },
            },
          },
          { meta: true }
        );

      async function getMetricsDefaultBackingIndicesLength() {
        const resLogsDatastream = await es.transport.request<any>(
          {
            method: 'GET',
            path: `/_data_stream/metrics-prometheus.remote_write-default`,
          },
          { meta: true }
        );

        return resLogsDatastream.body.data_streams[0].indices.length;
      }

      it('should rollover datastream if dynamic template dimension mappings changed', async () => {
        await installPackage('prometheus', '1.16.0');
        await writeMetricDoc();

        expect(await getMetricsDefaultBackingIndicesLength()).to.be(1);

        await installPackage('prometheus', '1.17.0');

        await writeMetricDoc();
        expect(await getMetricsDefaultBackingIndicesLength()).to.be(2);
      });

      afterEach(async () => {
        await uninstallPackage('prometheus', '1.17.0');
      });
    });
  });
}
