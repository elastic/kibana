/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { SearchHit, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { cleanUpEntityStore } from './infra/teardown';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { enableEntityStore } from './infra/setup';
import { createDocumentsAndTriggerTransform as createDocumentsAndTriggerUserTransform } from './infra/user_transform';

const DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
const INDEX_NAME: string = '.entities.v1.latest.security_user_default';
const TIMEOUT = 3600; // 60s

export default function (providerContext: FtrProviderContext) {
  const supertest = providerContext.getService('supertest');
  const log = providerContext.getService('log');
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');
  const dataView = dataViewRouteHelpersFactory(supertest);
  const entityAnalyticsApi = providerContext.getService('entityAnalyticsApi');

  describe('@ess CRUD API - Upsert', () => {
    describe('upsert user', () => {
      before(async () => {
        await cleanUpEntityStore(providerContext);
        // Initialize security solution by creating a prerequisite index pattern.
        // Helps avoid "Error initializing entity store: Data view not found 'security-solution-default'"
        await dataView.create('security-solution');
        // Create a test index matching transform's pattern to store test documents
        await es.indices.createDataStream({ name: DATASTREAM_NAME });

        log.info('before complete');
      });

      after(async () => {
        await es.indices.deleteDataStream({ name: DATASTREAM_NAME });
        await dataView.delete('security-solution');

        log.info('after complete');
      });

      beforeEach(async () => {
        await enableEntityStore(providerContext);
        log.info('beforeEach complete');
      });

      afterEach(async () => {
        await cleanUpEntityStore(providerContext);
        log.info('afterEach complete');
      });

      it('Should update an existing user', async () => {
        log.info('Creating user as test subject...');
        const userName = 'test-user-1';
        const testDocs = [{ user: { name: userName, domain: 'domain.com' } }];

        await createDocumentsAndTriggerUserTransform(providerContext, testDocs, DATASTREAM_NAME);

        await retry.waitForWithTimeout(
          'Document to be processed and transformed',
          TIMEOUT,
          async () => {
            await assertEntityFromES(es, userName, (hit) => {
              expect(hit._source?.user?.name).toEqual(userName);
              expect(hit._source?.user?.domain).toEqual(['domain.com']);
              expect(hit._source?.entity?.id).toEqual(userName);
            });

            return true;
          }
        );

        log.info('Calling upsert api...');
        const { statusCode } = await entityAnalyticsApi.upsertEntity({
          params: {
            entityType: 'user',
          },
          body: {
            entity: {
              id: userName,
              attributes: {
                privileged: true,
              },
              behaviors: {
                brute_force_victim: true,
              },
            },
          },
          query: {},
        });

        expect(statusCode).toEqual(200);

        log.info('Verifying upsert updated subject user...');
        await retry.waitForWithTimeout('Document is updated', TIMEOUT, async () => {
          await assertEntityFromES(es, userName, (hit) => {
            log.info(JSON.stringify(hit));
            expect(hit._source?.user?.name).toEqual(userName);
            expect(hit._source?.user?.domain).toEqual(['domain.com']);
            expect(hit._source?.entity?.id).toEqual(userName);
            expect(hit._source?.entity?.attributes?.Privileged).toBeTruthy();
            expect(hit._source?.entity?.behaviors?.Brute_force_victim).toBeTruthy();
          });

          return true;
        });

        const newTestDocs = [
          {
            user: {
              name: userName,
              domain: 'domain.com updated',
            },
          },
        ];

        log.info(`Verifying new documents don't override api update...`);
        await createDocumentsAndTriggerUserTransform(providerContext, newTestDocs, DATASTREAM_NAME);

        await retry.waitForWithTimeout('Make sure change was persisted', TIMEOUT, async () => {
          await assertEntityFromES(es, userName, (hit) => {
            expect(hit._source?.user?.name).toEqual(userName);
            expect(hit._source?.user?.domain).toHaveLength(2);
            expect(hit._source?.user?.domain).toContain('domain.com');
            expect(hit._source?.user?.domain).toContain('domain.com updated');
            expect(hit._source?.entity?.id).toEqual(userName);
            expect(hit._source?.entity?.attributes?.Privileged).toBeTruthy();
            expect(hit._source?.entity?.behaviors?.Brute_force_victim).toBeTruthy();
          });
          return true;
        });
      });
    });
  });
}

async function assertEntityFromES(
  es: ElasticsearchClient,
  entityId: string,
  doAssertion: (hit: SearchHit<any>) => void
) {
  const result = await es.search({
    index: INDEX_NAME,
    query: {
      term: {
        'entity.id': entityId,
      },
    },
  });
  const total = result.hits.total as SearchTotalHits;
  if (total.value !== 1) {
    throw new Error(`Expected 1 result, got ${total.value}`);
  }
  const hit = result.hits.hits[0] as SearchHit<any>;
  if (!hit._source) {
    throw new Error(`Expected hit to have source, got ${JSON.stringify(hit)}`);
  }
  doAssertion(hit);
}
