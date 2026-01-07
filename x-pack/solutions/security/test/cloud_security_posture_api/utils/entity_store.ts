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
      .delete(`${spacePath}/api/entity_store/engines?delete_data=true`)
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
 * Helper to wait for entity store engines to be fully started
 * This ensures asyncSetup has completed (not just enrich policy creation)
 * Critical: asyncSetup can fail after creating the enrich policy, and the
 * error handler will delete everything including the enrich policy
 */
export const waitForEntityStoreReady = async ({
  supertest,
  retry,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'retry' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(`Waiting for entity store engines to be fully started for space: ${spaceLabel}`);

  await retry.waitForWithTimeout('entity store engines to be started', 120000, async () => {
    try {
      const response = await supertest
        .get(`${spacePath}/api/entity_store/status`)
        .query({ include_components: true })
        .set('kbn-xsrf', 'xxxx');

      if (response.status !== 200) {
        logger.debug(`Entity store status check failed with status: ${response.status}`);
        return false;
      }

      const { status, engines = [] } = response.body;
      const engineStatuses = engines
        .map((e: { status: string; type: string }) => `${e.type}:${e.status}`)
        .join(', ');
      logger.debug(
        `Entity store status: ${status}, engines: ${engines.length}, engine statuses: ${engineStatuses}`
      );

      // If the overall status is 'error', the entity store won't recover
      // if (status === 'error') {
      //   throw new Error(`Entity store is in error state`);
      // }

      // Check if any engine has an error - this means asyncSetup failed
      const errorEngine = engines.find((e: { status: string }) => e.status === 'error') as
        | { type: string; status: string; error?: { message: string; action: string } }
        | undefined;
      if (errorEngine) {
        const errorMessage = errorEngine.error?.message || 'Unknown error';
        const errorAction = errorEngine.error?.action || 'unknown';
        throw new Error(
          `Entity store engine ${errorEngine.type} is in error state: [${errorAction}] ${errorMessage}`
        );
      }

      // Need at least the generic engine to be started
      // The 'started' status means asyncSetup completed successfully
      const genericEngine = engines.find((e: { type: string }) => e.type === 'generic');
      if (!genericEngine) {
        logger.debug('Generic engine not found yet');
        return false;
      }

      if ((genericEngine as { status: string }).status === 'started') {
        logger.debug('Entity store generic engine is fully started');
        return true;
      }

      logger.debug(
        `Generic engine status is ${(genericEngine as { status: string }).status}, waiting...`
      );
      return false;
    } catch (e) {
      if (e.message?.includes('error state')) {
        throw e; // Re-throw error state exceptions to fail fast
      }
      logger.debug(`Error checking entity store status: ${e.message}`);
      return false;
    }
  });
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
