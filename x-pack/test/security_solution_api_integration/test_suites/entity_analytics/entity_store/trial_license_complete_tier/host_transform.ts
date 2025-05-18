/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { Ecs, EcsHost } from '@elastic/ecs';
import type {
  IndexRequest,
  SearchHit,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import type { GetEntityStoreStatusResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/status.gen';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { EntityStoreUtils } from '../../utils';

const DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
const HOST_TRANSFORM_ID: string = 'entities-v1-latest-security_host_default';
const INDEX_NAME: string = '.entities.v1.latest.security_host_default';
const TIMEOUT_MS: number = 300000; // 5 minutes

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const dataView = dataViewRouteHelpersFactory(supertest);
  const utils = EntityStoreUtils(providerContext.getService);

  describe('Host transform logic', () => {
    describe('Entity Store is not installed by default', () => {
      it("Should return 200 and status 'not_installed'", async () => {
        const { body } = await supertest.get('/api/entity_store/status').expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('not_installed');
      });
    });

    describe('Install Entity Store and test Host transform', () => {
      before(async () => {
        await utils.cleanEngines();
        // Initialize security solution by creating a prerequisite index pattern.
        // Helps avoid "Error initializing entity store: Data view not found 'security-solution-default'"
        await dataView.create('security-solution');
        // Create a test index matching transform's pattern to store test documents
        await es.indices.createDataStream({ name: DATASTREAM_NAME });

        // Now we can enable the Entity Store...
        const response = await supertest
          .post('/api/entity_store/enable')
          .set('kbn-xsrf', 'xxxx')
          .send({});
        expect(response.statusCode).to.eql(200);
        expect(response.body.succeeded).to.eql(true);

        // and wait for it to start up
        await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
          const { body } = await supertest
            .get('/api/entity_store/status')
            .query({ include_components: true })
            .expect(200);
          expect(body.status).to.eql('running');
          return true;
        });
      });

      after(async () => {
        await es.indices.deleteDataStream({ name: DATASTREAM_NAME });
        await dataView.delete('security-solution');
      });

      afterEach(async () => {
        await utils.cleanEngines();
      });

      it("Should return 200 and status 'running' for all engines", async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({ include_components: true })
          .expect(200);

        const response: GetEntityStoreStatusResponse = body as GetEntityStoreStatusResponse;
        expect(response.status).to.eql('running');
        for (const engine of response.engines) {
          expect(engine.status).to.eql('started');
          if (!engine.components) {
            continue;
          }
          for (const component of engine.components) {
            expect(component.installed).to.be(true);
          }
        }
      });

      it('Should successfully trigger a host transform', async () => {
        const HOST_NAME: string = 'host-transform-test-ip';
        const IPs: string[] = ['1.1.1.1', '2.2.2.2'];
        const { count, transforms } = await es.transform.getTransformStats({
          transform_id: HOST_TRANSFORM_ID,
        });
        expect(count).to.eql(1);
        let transform = transforms[0];
        expect(transform.id).to.eql(HOST_TRANSFORM_ID);
        const triggerCount: number = transform.stats.trigger_count;
        const docsProcessed: number = transform.stats.documents_processed;

        // Create two documents with the same host.name, different IPs
        for (const ip of IPs) {
          const { result } = await es.index(buildHostTransformDocument(HOST_NAME, { ip }));
          expect(result).to.eql('created');
        }

        // Trigger the transform manually
        const { acknowledged } = await es.transform.scheduleNowTransform({
          transform_id: HOST_TRANSFORM_ID,
        });
        expect(acknowledged).to.be(true);

        await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
          const response = await es.transform.getTransformStats({
            transform_id: HOST_TRANSFORM_ID,
          });
          transform = response.transforms[0];
          expect(transform.stats.trigger_count).to.greaterThan(triggerCount);
          expect(transform.stats.documents_processed).to.greaterThan(docsProcessed);
          return true;
        });

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT_MS,
          async () => {
            const result = await es.search({
              index: INDEX_NAME,
              query: {
                term: {
                  'host.name': HOST_NAME,
                },
              },
            });
            const total = result.hits.total as SearchTotalHits;
            expect(total.value).to.eql(1);
            const hit = result.hits.hits[0] as SearchHit<Ecs>;
            expect(hit._source).ok();
            expect(hit._source?.host?.name).to.eql(HOST_NAME);
            expect(hit._source?.host?.ip).to.eql(IPs);

            return true;
          }
        );
      });
    });
  });
}

function buildHostTransformDocument(name: string, host: EcsHost): IndexRequest {
  host.name = name;
  // Get timestamp without the millisecond part
  const isoTimestamp: string = new Date().toISOString().split('.')[0];
  const document: IndexRequest = {
    index: DATASTREAM_NAME,
    document: {
      '@timestamp': isoTimestamp,
      host,
    },
  };
  return document;
}
