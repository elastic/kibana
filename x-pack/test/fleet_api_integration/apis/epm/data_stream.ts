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
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const pkgName = 'datastreams';
  const pkgVersion = '0.1.0';
  const pkgUpdateVersion = '0.2.0';
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;
  const namespaces = ['default', 'foo', 'bar'];

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

  describe('datastreams', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    beforeEach(async () => {
      await installPackage(pkgName, pkgVersion);
      await Promise.all(
        namespaces.map(async (namespace) => {
          const createLogsRequest = es.transport.request(
            {
              method: 'POST',
              path: `/${logsTemplateName}-${namespace}/_doc`,
              body: {
                '@timestamp': '2015-01-01',
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
          const createMetricsRequest = es.transport.request(
            {
              method: 'POST',
              path: `/${metricsTemplateName}-${namespace}/_doc`,
              body: {
                '@timestamp': '2015-01-01',
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
          return Promise.all([createLogsRequest, createMetricsRequest]);
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

      it('should rollover datstream after enabling a expiremental datastream feature that need a rollover', async () => {
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

        // Datastream should have been rolled over
        expect(await getLogsDefaultBackingIndicesLength()).to.be(2);
      });
    });
  });
}
