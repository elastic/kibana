/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent } from 'supertest';
import { CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import { ENTITY_STORE_ROUTES, API_VERSIONS } from '@kbn/entity-store/common';

export interface EntityStoreHelpersDeps {
  es: Client;
  logger: ToolingLog;
  retry: RetryService;
  supertest: Pick<Agent, 'get' | 'post' | 'delete'>;
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
    if (e.response?.status !== 404) {
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
 * Entity type for entity store engines
 */
export type EntityType = 'user' | 'host' | 'service' | 'generic';

/**
 * Helper to initialize an entity engine for a specific entity type
 * This mirrors the approach used in entity store tests (EntityStoreUtils.initEntityEngineForEntityType)
 */
export const initEntityEngine = async ({
  supertest,
  logger,
  entityType,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & {
  entityType: EntityType;
  spaceId?: string;
}) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(`Initializing entity engine for type ${entityType} in space: ${spaceLabel}`);

  const response = await supertest
    .post(`${spacePath}/api/entity_store/engines/${entityType}/init`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .set('x-elastic-internal-origin', 'kibana')
    .send({});

  if (response.status !== 200) {
    logger.error(`Failed to initialize engine for entity type ${entityType}: ${response.status}`);
    logger.error(JSON.stringify(response.body));
    throw new Error(`Failed to initialize entity engine: ${response.status}`);
  }

  logger.debug(`Entity engine ${entityType} initialized for space: ${spaceLabel}`);
  return response;
};

/**
 * Helper to initialize entity engines and wait for them to be fully started
 * This mirrors the approach used in entity store tests (EntityStoreUtils.initEntityEngineForEntityTypesAndWait)
 */
export const initEntityEnginesAndWait = async ({
  supertest,
  retry,
  logger,
  entityTypes,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'retry' | 'logger'> & {
  entityTypes: EntityType[];
  spaceId?: string;
}) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(
    `Initializing entity engines for types ${entityTypes.join(', ')} in space: ${spaceLabel}`
  );

  // Initialize all engines in parallel
  await Promise.all(
    entityTypes.map((entityType) => initEntityEngine({ supertest, logger, entityType, spaceId }))
  );

  // Wait for all engines to be started
  await retry.waitForWithTimeout(
    `Engines to start for entity types: ${entityTypes.join(', ')}`,
    60000,
    async () => {
      const response = await supertest
        .get(`${spacePath}/api/entity_store/status`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31');

      if (response.status !== 200) {
        logger.debug(`Entity store status check failed with status: ${response.status}`);
        return false;
      }

      const { engines = [] } = response.body;
      const engineStatuses = engines
        .map((e: { status: string; type: string }) => `${e.type}:${e.status}`)
        .join(', ');
      logger.debug(`Engine statuses: ${engineStatuses}`);

      // Check if all requested engines are started
      const allStarted = entityTypes.every((entityType) => {
        const engine = engines.find((e: { type: string }) => e.type === entityType);
        return engine && (engine as { status: string }).status === 'started';
      });

      if (allStarted) {
        logger.debug(`All engines started for types: ${entityTypes.join(', ')}`);
        return true;
      }

      // Check if any engine has an error
      const errorEngine = engines.find((e: { status: string }) => e.status === 'error') as
        | { type: string; status: string; error?: { message: string } }
        | undefined;
      if (errorEngine) {
        throw new Error(
          `Engine ${errorEngine.type} is in error state: ${
            errorEngine.error?.message || 'Unknown error'
          }`
        );
      }

      return false;
    }
  );
};

/**
 * Helper to initialize entity engines with retry logic on failure
 * This mirrors the robust pattern used in entity store API integration tests (infra/setup.ts)
 * If initialization fails (engine enters error state), it cleans up and retries
 */
export const initEntityEnginesWithRetry = async ({
  supertest,
  retry,
  logger,
  entityTypes,
  spaceId,
  maxRetries = 3,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'retry' | 'logger'> & {
  entityTypes: EntityType[];
  spaceId?: string;
  maxRetries?: number;
}) => {
  const spaceLabel = spaceId || 'default';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.debug(
      `Initializing entity engines for types ${entityTypes.join(
        ', '
      )} in space: ${spaceLabel} (attempt ${attempt}/${maxRetries})`
    );

    try {
      await initEntityEnginesAndWait({
        supertest,
        retry,
        logger,
        entityTypes,
        spaceId,
      });

      logger.debug(
        `Entity engines initialized successfully for types: ${entityTypes.join(
          ', '
        )} in space: ${spaceLabel}`
      );
      return; // Success - exit the retry loop
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(
        `Entity engine initialization failed (attempt ${attempt}/${maxRetries}): ${errorMessage}`
      );

      if (attempt < maxRetries) {
        // Clean up before retrying
        logger.debug(`Cleaning up entity store before retry...`);
        await cleanupEntityStore({ supertest, logger, spaceId });

        // Small delay before retry to allow cleanup to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // Last attempt failed - throw the error
        throw new Error(
          `Entity engine initialization failed after ${maxRetries} attempts. Last error: ${errorMessage}`
        );
      }
    }
  }
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

// --- Entity Store V2 helpers ---

const PUBLIC_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': API_VERSIONS.public.v1,
  'x-elastic-internal-origin': 'kibana',
};

/**
 * Helper to install Entity Store V2
 */
export const installEntityStoreV2 = async ({
  supertest,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(`Installing Entity Store V2 for space: ${spaceLabel}`);

  const response = await supertest
    .post(`${spacePath}${ENTITY_STORE_ROUTES.public.INSTALL}`)
    .set(PUBLIC_HEADERS)
    .send({});

  if (response.status !== 200 && response.status !== 201) {
    logger.error(`Failed to install Entity Store V2: ${response.status}`);
    logger.error(JSON.stringify(response.body));
    throw new Error(`Failed to install Entity Store V2: ${response.status}`);
  }

  logger.debug(`Entity Store V2 installed for space: ${spaceLabel}`);
  return response;
};

/**
 * Helper to uninstall Entity Store V2
 */
export const uninstallEntityStoreV2 = async ({
  supertest,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(`Uninstalling Entity Store V2 for space: ${spaceLabel}`);

  try {
    await supertest
      .post(`${spacePath}${ENTITY_STORE_ROUTES.public.UNINSTALL}`)
      .set(PUBLIC_HEADERS)
      .send({})
      .expect(200);
    logger.debug(`Entity Store V2 uninstalled for space: ${spaceLabel}`);
  } catch (e) {
    if (e.response?.status !== 404) {
      logger.debug(
        `Error uninstalling Entity Store V2 for space ${spaceLabel}: ${
          e && e.message ? e.message : JSON.stringify(e)
        }`
      );
    }
  }
};

/**
 * Helper to wait for Entity Store V2 to reach 'running' status
 */
export const waitForEntityStoreV2Running = async ({
  supertest,
  retry,
  logger,
  spaceId,
}: Pick<EntityStoreHelpersDeps, 'supertest' | 'retry' | 'logger'> & { spaceId?: string }) => {
  const spacePath = spaceId ? `/s/${spaceId}` : '';
  const spaceLabel = spaceId || 'default';
  logger.debug(`Waiting for Entity Store V2 to be running in space: ${spaceLabel}`);

  await retry.waitForWithTimeout('Entity Store V2 to be running', 60000, async () => {
    const response = await supertest
      .get(`${spacePath}${ENTITY_STORE_ROUTES.public.STATUS}`)
      .set(PUBLIC_HEADERS);

    if (response.status !== 200) {
      logger.debug(`Entity Store V2 status check failed with status: ${response.status}`);
      return false;
    }

    const { status } = response.body;
    logger.debug(`Entity Store V2 status: ${status}`);

    if (status === 'error') {
      throw new Error(
        `Entity Store V2 is in error state: ${response.body.error?.message || 'Unknown error'}`
      );
    }

    return status === 'running';
  });
};
