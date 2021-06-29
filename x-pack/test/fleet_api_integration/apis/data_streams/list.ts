/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const pkgName = 'datastreams';
  const pkgVersion = '0.1.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

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

  const seedDataStreams = async () => {
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
  };

  const getDataStreams = async () => {
    return await supertest.get(`/api/fleet/data_streams`).set('kbn-xsrf', 'xxxx');
  };

  describe('data_streams_list', async () => {
    skipIfNoDockerRegistry(providerContext);

    beforeEach(async () => {
      await installPackage(pkgKey);
    });

    afterEach(async () => {
      await uninstallPackage(pkgKey);
      try {
        await es.transport.request({
          method: 'DELETE',
          path: `/_data_stream/${logsTemplateName}-default`,
        });
        await es.transport.request({
          method: 'DELETE',
          path: `/_data_stream/${metricsTemplateName}-default`,
        });
      } catch (e) {
        // Silently swallow errors here as not all tests seed data streams
      }
    });

    it("should return no data streams when there isn't any data yet", async function () {
      const { body } = await getDataStreams();
      expect(body).to.eql({ data_streams: [] });
    });

    it('should return correct data stream information', async function () {
      await seedDataStreams();
      await retry.tryForTime(10000, async () => {
        const { body } = await getDataStreams();
        return expect(
          body.data_streams.map((dataStream: any) => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { index, size_in_bytes, ...rest } = dataStream;
            return rest;
          })
        ).to.eql([
          {
            dataset: 'datastreams.test_logs',
            namespace: 'default',
            type: 'logs',
            package: 'datastreams',
            package_version: '0.1.0',
            last_activity_ms: 1420070400000,
            dashboards: [],
          },
          {
            dataset: 'datastreams.test_metrics',
            namespace: 'default',
            type: 'metrics',
            package: 'datastreams',
            package_version: '0.1.0',
            last_activity_ms: 1420070400000,
            dashboards: [],
          },
        ]);
      });
    });

    it('should return correct number of data streams regardless of number of backing indices', async function () {
      await seedDataStreams();
      await retry.tryForTime(10000, async () => {
        const { body } = await getDataStreams();
        return expect(body.data_streams.length).to.eql(2);
      });

      // Rollover data streams to increase # of backing indices and seed the new write index
      await es.transport.request({
        method: 'POST',
        path: `/${logsTemplateName}-default/_rollover`,
      });
      await es.transport.request({
        method: 'POST',
        path: `/${metricsTemplateName}-default/_rollover`,
      });
      await seedDataStreams();

      // Wait until backing indices are created
      await retry.tryForTime(10000, async () => {
        const { body } = await es.transport.request({
          method: 'GET',
          path: `/${logsTemplateName}-default,${metricsTemplateName}-default/_search`,
          body: {
            size: 0,
            aggs: {
              index: {
                terms: {
                  field: '_index',
                  size: 100000,
                },
              },
            },
          },
        });
        expect(body.aggregations.index.buckets.length).to.eql(4);
      });

      // Check that data streams still return correctly
      const { body } = await getDataStreams();
      return expect(body.data_streams.length).to.eql(2);
    });
  });
}
