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

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest
      .post(`/api/ingest_manager/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('datastreams', async () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await installPackage(pkgKey);
      await es.transport.request({
        method: 'POST',
        path: `/${logsTemplateName}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_logs`,
            namespace: 'default',
            type: 'logs',
          },
        },
      });
      await es.transport.request({
        method: 'POST',
        path: `/${metricsTemplateName}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_metrics`,
            namespace: 'default',
            type: 'metrics',
          },
        },
      });
    });
    after(async () => {
      await uninstallPackage(pkgUpdateKey);
      await es.transport.request({
        method: 'DELETE',
        path: `/_data_stream/${logsTemplateName}-default`,
      });
      await es.transport.request({
        method: 'DELETE',
        path: `/_data_stream/${metricsTemplateName}-default`,
      });
    });
    describe('get datastreams after data sent', async () => {
      skipIfNoDockerRegistry(providerContext);
      let resLogsDatastream: any;
      let resMetricsDatastream: any;
      before(async () => {
        resLogsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${logsTemplateName}-default`,
        });
        resMetricsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${metricsTemplateName}-default`,
        });
      });
      it('should list the logs datastream', async function () {
        expect(resLogsDatastream.body.data_streams.length).equal(1);
        expect(resLogsDatastream.body.data_streams[0].indices.length).equal(1);
        expect(resLogsDatastream.body.data_streams[0].indices[0].index_name).equal(
          `.ds-${logsTemplateName}-default-000001`
        );
      });
      it('should list the metrics datastream', async function () {
        expect(resMetricsDatastream.body.data_streams.length).equal(1);
        expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
        expect(resMetricsDatastream.body.data_streams[0].indices[0].index_name).equal(
          `.ds-${metricsTemplateName}-default-000001`
        );
      });
    });
    describe('rollover datastream when mappings are not compatible', async () => {
      skipIfNoDockerRegistry(providerContext);
      let resLogsDatastream: any;
      let resMetricsDatastream: any;
      before(async () => {
        await installPackage(pkgUpdateKey);
        resLogsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${logsTemplateName}-default`,
        });
        resMetricsDatastream = await es.transport.request({
          method: 'GET',
          path: `/_data_stream/${metricsTemplateName}-default`,
        });
      });
      it('should have rolled over logs datastream', async function () {
        expect(resLogsDatastream.body.data_streams[0].indices.length).equal(2);
        expect(resLogsDatastream.body.data_streams[0].indices[1].index_name).equal(
          `.ds-${logsTemplateName}-default-000002`
        );
      });
      it('should have not rolled over metrics datastream', async function () {
        expect(resMetricsDatastream.body.data_streams[0].indices.length).equal(1);
      });
    });
  });
}
