/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const pkgName = 'datastreams';
  const pkgVersion = '0.1.0';
  const pkgUpdateVersion = '0.2.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const pkgUpdateKey = `${pkgName}-${pkgUpdateVersion}`;
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;
  const namespaces = ['default', 'foo', 'bar'];

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  describe('datastreams', async () => {
    skipIfNoDockerRegistry(providerContext);

    beforeEach(async () => {
      await installPackage(pkgKey);
      await Promise.all(
        namespaces.map(async (namespace) => {
          const createLogsRequest = es.transport.request({
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
          });
          const createMetricsRequest = es.transport.request({
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
          });
          return Promise.all([createLogsRequest, createMetricsRequest]);
        })
      );
    });

    afterEach(async () => {
      await Promise.all(
        namespaces.map(async (namespace) => {
          const deleteLogsRequest = es.transport.request({
            method: 'DELETE',
            path: `/_data_stream/${logsTemplateName}-${namespace}`,
          });
          const deleteMetricsRequest = es.transport.request({
            method: 'DELETE',
            path: `/_data_stream/${metricsTemplateName}-${namespace}`,
          });
          return Promise.all([deleteLogsRequest, deleteMetricsRequest]);
        })
      );
      await uninstallPackage(pkgKey);
      await uninstallPackage(pkgUpdateKey);
    });

    it('should list the logs and metrics datastream', async function () {
      namespaces.forEach(async (namespace) => {
        const resLogsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${logsTemplateName}-${namespace}`,
        });
        const resMetricsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${metricsTemplateName}-${namespace}`,
        });
        expect(resLogsDatastream.body.data_streams.length).equal(1);
        expect(resLogsDatastream.body.data_streams[0].indices.length).equal(1);
        expect(resMetricsDatastream.body.data_streams.length).equal(1);
        expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
      });
    });

    it('after update, it should have rolled over logs datastream because mappings are not compatible and not metrics', async function () {
      await installPackage(pkgUpdateKey);
      namespaces.forEach(async (namespace) => {
        const resLogsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${logsTemplateName}-${namespace}`,
        });
        const resMetricsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${metricsTemplateName}-${namespace}`,
        });
        expect(resLogsDatastream.body.data_streams[0].indices.length).equal(2);
        expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
      });
    });

    it('should be able to upgrade a package after a rollover', async function () {
      namespaces.forEach(async (namespace) => {
        await es.transport.request({
          method: 'POST',
          path: `/${logsTemplateName}-${namespace}/_rollover`,
        });
        const resLogsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${logsTemplateName}-${namespace}`,
        });
        expect(resLogsDatastream.body.data_streams[0].indices.length).equal(2);
      });
      await installPackage(pkgUpdateKey);
    });
  });
}
