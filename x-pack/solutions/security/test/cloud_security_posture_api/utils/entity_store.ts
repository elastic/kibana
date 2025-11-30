/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type SuperTest from 'supertest';

export interface EntityStoreHelpersDeps {
  es: Client;
  logger: ToolingLog;
  retry: RetryService;
  supertest: SuperTest.Agent;
}

/**
 * Helper to clean up entity store resources
 */
export const cleanupEntityStore = async ({
  supertest,
  logger,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'>) => {
  try {
    await supertest
      .delete('/api/entity_store/engines/generic?data=true')
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    logger.debug('Deleted entity store engine');
  } catch (e) {
    // Ignore 404 errors if the engine doesn't exist
    if (e.status !== 404) {
      logger.debug(`Error deleting entity store engine: ${e.message || JSON.stringify(e)}`);
    }
  }
};

/**
 * Helper to wait for enrich index to be populated
 */
export const waitForEnrichIndexPopulated = async ({
  es,
  logger,
  retry,
  enrichIndexName,
}: Pick<EntityStoreHelpersDeps, 'es' | 'logger' | 'retry'> & { enrichIndexName: string }) => {
  await retry.waitFor('enrich index to be created and populated', async () => {
    try {
      const count = await es.count({
        index: enrichIndexName,
      });
      logger.debug(`Enrich index count: ${count.count}`);
      return count.count > 0;
    } catch (e) {
      logger.debug(`Waiting for enrich index: ${e.message}`);
      return false;
    }
  });
};

/**
 * Helper to wait for entity data to be indexed
 */
export const waitForEntityDataIndexed = async ({
  es,
  logger,
  retry,
  entitiesIndex,
  expectedCount,
}: Pick<EntityStoreHelpersDeps, 'es' | 'logger' | 'retry'> & {
  entitiesIndex: string;
  expectedCount: number;
}) => {
  await retry.waitFor('entity data to be indexed', async () => {
    try {
      const response = await es.count({
        index: entitiesIndex,
      });
      logger.debug(`Entity count: ${response.count}`);
      return response.count === expectedCount;
    } catch (e) {
      logger.debug(`Error counting entities: ${e.message}`);
      return false;
    }
  });
};

/**
 * Helper to enable asset inventory
 */
export const enableAssetInventory = async ({
  supertest,
}: Pick<EntityStoreHelpersDeps, 'supertest'>) => {
  await supertest.post('/api/asset_inventory/enable').set('kbn-xsrf', 'xxxx').send({}).expect(200);
};
