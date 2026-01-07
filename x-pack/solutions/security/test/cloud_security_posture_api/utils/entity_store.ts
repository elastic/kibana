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
 * Helper to bulk index entity data directly using ES client
 * This avoids using esArchiver for internal/system indices which causes instability
 */
export const indexEntityData = async ({
  es,
  logger,
  indexName,
  data,
}: Pick<EntityStoreHelpersDeps, 'es' | 'logger'> & {
  indexName: string;
  data: Array<{ id: string; source: Record<string, unknown> }>;
}) => {
  logger.debug(`Indexing ${data.length} entity documents to ${indexName}`);

  const operations = data.flatMap((doc) => [
    { index: { _index: indexName, _id: doc.id } },
    doc.source,
  ]);

  const response = await es.bulk({
    operations,
    refresh: true,
  });

  if (response.errors) {
    const errorItems = response.items.filter((item) => item.index?.error);
    logger.error(`Bulk index errors: ${JSON.stringify(errorItems)}`);
    throw new Error(`Failed to index entity data: ${JSON.stringify(errorItems)}`);
  }

  logger.debug(`Successfully indexed ${data.length} entity documents`);
  return response;
};

/**
 * Helper to delete entity data indexed via ES client
 */
export const deleteEntityData = async ({
  es,
  logger,
  indexName,
}: Pick<EntityStoreHelpersDeps, 'es' | 'logger'> & { indexName: string }) => {
  logger.debug(`Deleting entity data from ${indexName}`);

  try {
    await es.deleteByQuery({
      index: indexName,
      query: { match_all: {} },
      conflicts: 'proceed',
      refresh: true,
    });
    logger.debug(`Successfully deleted entity data from ${indexName}`);
  } catch (e) {
    // Index might not exist, which is fine
    logger.debug(`Error deleting entity data: ${e.message}`);
  }
};

/**
 * Entity test data for v1 entity store tests
 * This data is indexed directly via ES client instead of using esArchiver
 * to avoid conflicts with internal/system indices
 */
export const ENTITY_STORE_TEST_DATA = [
  {
    id: '1',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'api-service@your-project-id.iam.gserviceaccount.com',
        name: 'ApiServiceAccount',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'api-service@your-project-id.iam.gserviceaccount.com',
        name: 'ApiServiceAccount',
      },
    },
  },
  {
    id: '2',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'us-central1',
        service: { name: 'GCP Compute' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'host-instance-1',
        name: 'HostInstance1',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-compute_gcp_compute_instance-default-2025.07.16-000005',
        sub_type: 'GCP Compute Instance',
        type: 'Host',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      host: { id: 'host-instance-1', name: 'HostInstance1' },
    },
  },
  {
    id: '3',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'us-east1',
        service: { name: 'GCP Compute' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'host-instance-2',
        name: 'HostInstance2',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-compute_gcp_compute_instance-default-2025.07.16-000005',
        sub_type: 'GCP Compute Instance',
        type: 'Host',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      host: { id: 'host-instance-2', name: 'HostInstance2' },
    },
  },
  {
    id: '4',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/serviceAccounts/target-service-1@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService1',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'projects/your-project-id/serviceAccounts/target-service-1@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService1',
      },
    },
  },
  {
    id: '5',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/serviceAccounts/target-service-2@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService2',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'projects/your-project-id/serviceAccounts/target-service-2@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService2',
      },
    },
  },
  {
    id: '6',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/serviceAccounts/target-service-3@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService3',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'projects/your-project-id/serviceAccounts/target-service-3@your-project-id.iam.gserviceaccount.com',
        name: 'TargetService3',
      },
    },
  },
  {
    id: '7',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP Storage' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/buckets/target-bucket-1',
        name: 'TargetBucket1',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-storage_gcp_bucket-default-2025.07.16-000005',
        sub_type: 'GCP Storage Bucket',
        type: 'Storage',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
    },
  },
  {
    id: '8',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP Storage' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/buckets/target-bucket-2',
        name: 'TargetBucket2',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-storage_gcp_bucket-default-2025.07.16-000005',
        sub_type: 'GCP Storage Bucket',
        type: 'Storage',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
    },
  },
  {
    id: '9',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/serviceAccounts/target-multi-service-1@your-project-id.iam.gserviceaccount.com',
        name: 'TargetMultiService1',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'projects/your-project-id/serviceAccounts/target-multi-service-1@your-project-id.iam.gserviceaccount.com',
        name: 'TargetMultiService1',
      },
    },
  },
  {
    id: '10',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'projects/your-project-id/serviceAccounts/target-multi-service-2@your-project-id.iam.gserviceaccount.com',
        name: 'TargetMultiService2',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_service_account-default-2025.07.16-000005',
        sub_type: 'GCP Service Account',
        type: 'Service',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      service: {
        id: 'projects/your-project-id/serviceAccounts/target-multi-service-2@your-project-id.iam.gserviceaccount.com',
        name: 'TargetMultiService2',
      },
    },
  },
  {
    id: '11',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'multi-actor-1@example.com',
        name: 'MultiActor1',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_iam_user-default-2025.07.16-000005',
        sub_type: 'GCP IAM User',
        type: 'Identity',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      user: { id: 'multi-actor-1@example.com', name: 'MultiActor1' },
    },
  },
  {
    id: '12',
    source: {
      '@timestamp': '2025-07-20T17:26:09.361Z',
      cloud: {
        account: { id: 'your-project-id', name: 'your-project-name' },
        provider: 'gcp',
        region: 'global',
        service: { name: 'GCP IAM' },
      },
      entity: {
        EngineMetadata: { Type: 'generic' },
        id: 'multi-actor-2@example.com',
        name: 'MultiActor2',
        source:
          '.ds-logs-cloud_asset_inventory.asset_inventory-identity_gcp_iam_user-default-2025.07.16-000005',
        sub_type: 'GCP IAM User',
        type: 'Identity',
      },
      event: { ingested: '2025-07-20T17:27:13.583Z' },
      user: { id: 'multi-actor-2@example.com', name: 'MultiActor2' },
    },
  },
];

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
