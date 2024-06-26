/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from '../agents/services';
import { skipIfNoDockerRegistry } from '../../helpers';

const TEST_INDEX = 'logs-log.log-test';

const CUSTOM_PIPELINE = 'logs-log.log@custom';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  // TODO: Use test package or move to input package version github.com/elastic/kibana/issues/154243
  const LOG_INTEGRATION_VERSION = '1.1.2';
  describe('custom ingest pipeline for fleet managed datastreams', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    before(async () => {
      await supertest
        .post(`/api/fleet/epm/packages/log/${LOG_INTEGRATION_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/log/${LOG_INTEGRATION_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      const res = await es.search({
        index: TEST_INDEX,
      });

      for (const hit of res.hits.hits) {
        await es.delete({
          id: hit._id!,
          index: hit._index,
        });
      }
    });

    describe('Without custom pipeline', () => {
      it('Should write doc correctly', async () => {
        const res = await es.index({
          index: 'logs-log.log-test',
          body: {
            '@timestamp': '2020-01-01T09:09:00',
            message: 'hello',
          },
        });

        await es.get({
          id: res._id,
          index: res._index,
        });
      });
    });

    describe('With custom pipeline', () => {
      before(async () => {
        await es.ingest.putPipeline({
          id: 'global@custom',
          processors: [
            {
              append: {
                field: 'test',
                value: ['global'],
              },
            },
          ],
        });

        await es.ingest.putPipeline({
          id: 'logs@custom',
          processors: [
            {
              append: {
                field: 'test',
                value: ['logs'],
              },
            },
          ],
        });

        await es.ingest.putPipeline({
          id: `logs-log.integration@custom`,
          processors: [
            {
              append: {
                field: 'test',
                value: ['logs-log.integration'],
              },
            },
          ],
        });

        await es.ingest.putPipeline({
          id: CUSTOM_PIPELINE,
          processors: [
            {
              append: {
                field: 'test',
                value: ['logs-log.log'],
              },
            },
          ],
        });
      });

      after(() =>
        Promise.all([
          es.ingest.deletePipeline({
            id: 'global@custom',
          }),
          es.ingest.deletePipeline({
            id: 'logs@custom',
          }),
          es.ingest.deletePipeline({
            id: 'logs-log.integration@custom',
          }),
          es.ingest.deletePipeline({
            id: CUSTOM_PIPELINE,
          }),
        ])
      );
      it('Should write doc correctly', async () => {
        const res = await es.index({
          index: 'logs-log.log-test',
          body: {
            '@timestamp': '2020-01-01T09:09:00',
            message: 'hello',
          },
        });

        const doc = await es.get<{ test: string }>({
          id: res._id,
          index: res._index,
        });
        expect(doc._source?.test).be.eql([
          'global',
          'logs',
          'logs-log.integration',
          'logs-log.log',
        ]);
      });
    });
  });
}
