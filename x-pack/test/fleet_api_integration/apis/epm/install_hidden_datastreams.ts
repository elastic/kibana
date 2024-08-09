/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installing with hidden datastream', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    afterEach(async () => {
      await deletePackage('apm', '8.8.0');
    });

    it('should not rollover datastreams when successfully updated mappings', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/apm/8.8.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await es.index({
        index: 'metrics-apm.app.default-default',
        document: {
          '@timestamp': '2023-05-30T07:50:00.000Z',
          agent: {
            name: 'go',
          },
          data_stream: {
            dataset: 'metrics-apm.app.default',
            namespace: 'default',
            type: 'metrics',
          },
          ecs: {
            version: '8.8.0-dev',
          },
          event: {
            agent_id_status: 'missing',
            ingested: '2023-05-30T07:57:12Z',
          },
          observer: {
            hostname: '047e282994fb',
            type: 'apm-server',
            version: '8.8.0',
          },
        },
      });

      let ds = await es.indices.get({
        index: 'metrics-apm.app.default*',
        expand_wildcards: ['open', 'hidden'],
      });
      const indicesBefore = Object.keys(ds).length;

      await supertest
        .post(`/api/fleet/epm/packages/apm/8.8.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      ds = await es.indices.get({
        index: 'metrics-apm.app.default*',
        expand_wildcards: ['open', 'hidden'],
      });
      const indicesAfter = Object.keys(ds).length;
      // datastream did not roll over
      expect(indicesAfter).equal(indicesBefore);
    });

    it('should not rollover datastream when failed to update mappings and skipDataStreamRollover is true', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/apm/8.7.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await es.index({
        index: 'metrics-apm.service_summary.10m-default',
        document: {
          '@timestamp': '2023-05-30T07:50:00.000Z',
          agent: {
            name: 'go',
          },
          data_stream: {
            dataset: 'apm.service_summary.10m',
            namespace: 'default',
            type: 'metrics',
          },
          ecs: {
            version: '8.6.0-dev',
          },
          event: {
            agent_id_status: 'missing',
            ingested: '2023-05-30T07:57:12Z',
          },
          metricset: {
            interval: '10m',
            name: 'service_summary',
          },
          observer: {
            hostname: '047e282994fb',
            type: 'apm-server',
            version: '8.7.0',
          },
          processor: {
            event: 'metric',
            name: 'metric',
          },
          service: {
            language: {
              name: 'go',
            },
            name: '___main_elastic_cloud_87_ilm_fix',
          },
        },
      });

      let ds = await es.indices.get({
        index: 'metrics-apm.service_summary*',
        expand_wildcards: ['open', 'hidden'],
      });
      const indicesBefore = Object.keys(ds).length;

      await supertest
        .post(`/api/fleet/epm/packages/apm/8.8.0?skipDataStreamRollover=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      ds = await es.indices.get({
        index: 'metrics-apm.service_summary*',
        expand_wildcards: ['open', 'hidden'],
      });
      const indicesAfter = Object.keys(ds).length;
      // datastream did not roll over
      expect(indicesAfter).equal(indicesBefore);
    });
  });
}
