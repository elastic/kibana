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
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import { CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';

export interface EntityStoreHelpersDeps {
  es: Client;
  logger: ToolingLog;
  retry: RetryService;
  supertest: SuperTest.Agent;
}

/**
 * Helper to clean up entity store resources for a given space
 */
export const cleanupEntityStore = async ({
  supertest,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  try {
    await supertest
      .delete(`${spacePath}/api/entity_store/engines/generic?delete_data=true`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    logger.debug(`Deleted entity store engine for space: ${spaceId || 'default'}`);
  } catch (e) {
    // Ignore 404 errors if the engine doesn't exist
    if (e.status !== 404) {
      logger.debug(
        `Error deleting entity store for space ${spaceId || 'default'}: ${
          e && e.message ? e.message : JSON.stringify(e)
        }`
      );
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
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'es' | 'logger' | 'retry'> & { spaceId?: string }) => {
  const spaceIdentifier = spaceId || 'default';
  const enrichIndexName = `.enrich-${getEnrichPolicyId(spaceId)}`;
  await retry.waitFor(
    `enrich index to be created and populated for ${spaceIdentifier} space`,
    async () => {
      try {
        await es.enrich.executePolicy({
          name: getEnrichPolicyId(spaceId),
          wait_for_completion: true,
        });
        // Check if the enrich index has data (policy has been executed)
        const count = await es.count({
          index: enrichIndexName,
        });
        logger.debug(`Enrich index count: ${count.count}`);
        return count.count > 0;
      } catch (e) {
        logger.debug(`Waiting for enrich index: ${e.message}`);
        return false;
      }
    }
  );
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
 * Helper to enable asset inventory for a given space
 */
export const enableAssetInventory = async ({
  supertest,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  logger.debug(`Enabling asset inventory for space: ${spaceId || 'default'}`);
  await supertest
    .post(`${spacePath}/api/asset_inventory/enable`)
    .set('kbn-xsrf', 'xxxx')
    .send({})
    .expect(200);
  logger.debug(`Asset inventory enabled for space: ${spaceId || 'default'}`);
};

/**
 * Helper to wait for enrich policy to be created
 */
export const waitForEnrichPolicyCreated = async ({
  es,
  retry,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'es' | 'retry' | 'logger'> & { spaceId?: string }) => {
  const policyId = getEnrichPolicyId(spaceId);
  logger.debug(`Waiting for enrich policy to be created: ${policyId}`);
  await retry.waitForWithTimeout('enrich policy to be created', 200000, async () => {
    try {
      const res = await es.enrich.getPolicy({ name: policyId });
      const policy = res.policies?.[0];
      if (policy) {
        logger.debug(`Enrich policy found: ${JSON.stringify(res)}`);
        return true;
      } else {
        logger.debug(`Enrich policy not found in response: ${JSON.stringify(res)}`);
        return false;
      }
    } catch (e) {
      logger.debug(`Error getting enrich policy: ${e.message || JSON.stringify(e)}`);
      return false;
    }
  });
};

/**
 * Helper to execute enrich policy with retry logic
 */
export const executeEnrichPolicy = async ({
  es,
  retry,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'es' | 'retry' | 'logger'> & { spaceId?: string }) => {
  const spaceIdentifier = spaceId || 'default';
  const policyId = getEnrichPolicyId(spaceId);
  const enrichIndexName = `.enrich-${policyId}`;
  logger.debug(`Executing enrich policy: ${policyId} for space: ${spaceIdentifier}`);
  await retry.waitForWithTimeout(
    `enrich policy to be executed for ${spaceIdentifier} space`,
    20000,
    async () => {
      logger.debug(`Attempting to execute enrich policy: ${policyId}`);
      try {
        const data = await es.enrich.executePolicy({
          name: policyId,
          wait_for_completion: true,
        });
        logger.debug(`Enrich policy executed: ${JSON.stringify(data)}`);

        // Check if the enrich index has documents
        const countResponse = await es.count({
          index: enrichIndexName,
        });
        logger.debug(`Enrich index [${enrichIndexName}] document count: ${countResponse.count}`);

        return countResponse.count > 0;
      } catch (e) {
        logger.debug(`Error executing enrich policy: ${e.message || JSON.stringify(e)}`);
        return false;
      }
    }
  );
};

/**
 * Helper to install cloud asset inventory package
 */
export const installCloudAssetInventoryPackage = async ({
  supertest,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  logger.debug(
    `Installing cloud asset inventory package v${CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION} for space: ${
      spaceId || 'default'
    }`
  );
  await supertest
    .post(`${spacePath}/api/fleet/epm/packages/_bulk`)
    .set('kbn-xsrf', 'xxxx')
    .send({
      packages: [
        {
          name: 'cloud_asset_inventory',
          version: CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION,
        },
      ],
    })
    .expect(200);
  logger.debug(`Cloud asset inventory package installed for space: ${spaceId || 'default'}`);
};
