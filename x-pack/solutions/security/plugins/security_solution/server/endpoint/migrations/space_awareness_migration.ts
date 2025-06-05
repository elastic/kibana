/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS, ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { UpdateExceptionListItemOptions } from '@kbn/lists-plugin/server';
import pMap from 'p-map';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import { stringify } from '../utils/stringify';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../lib/reference_data';
import {
  buildSpaceOwnerIdTag,
  hasArtifactOwnerSpaceId,
} from '../../../common/endpoint/service/artifacts/utils';
import { catchAndWrapError, wrapErrorIfNeeded } from '../utils';
import { QueueProcessor } from '../utils/queue_processor';
import type { EndpointAppContextService } from '../endpoint_app_context_services';
import type { ReferenceDataSavedObject } from '../lib/reference_data/types';

const LOGGER_KEY = 'migrateEndpointDataToSupportSpaces';
const ARTIFACTS_MIGRATION_REF_DATA_ID = 'SPACE-AWARENESS-ARTIFACT-MIGRATION' as const;
const RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID =
  'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION' as const;

interface MigrationState {
  started: string;
  finished: string;
  status: 'not-started' | 'complete' | 'pending';
  data?: unknown;
}

export const migrateEndpointDataToSupportSpaces = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY);

  if (!endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    logger.debug('Space awareness feature flag is disabled. Nothing to do.');
    return;
  }

  await Promise.all([
    migrateArtifactsToSpaceAware(endpointService),
    migrateResponseActionsToSpaceAware(endpointService),
  ]);
};

// TODO:PT move this to a new data access client
const getMigrationState = async (
  soClient: SavedObjectsClientContract,
  logger: Logger,
  id: typeof ARTIFACTS_MIGRATION_REF_DATA_ID | typeof RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID
): Promise<ReferenceDataSavedObject<MigrationState>> => {
  return soClient
    .get<ReferenceDataSavedObject<MigrationState>>(
      REFERENCE_DATA_SAVED_OBJECT_TYPE,
      ARTIFACTS_MIGRATION_REF_DATA_ID
    )
    .then((response) => {
      logger.debug(`Retrieved migration state for [${id}]\n${stringify(response)}`);
      return response.attributes;
    })
    .catch(async (err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        logger.debug(`Creating migration state for [${id}]`);

        const createResponse = await soClient
          .create<ReferenceDataSavedObject<MigrationState>>(
            REFERENCE_DATA_SAVED_OBJECT_TYPE,
            {
              id,
              type: 'MIGRATION',
              owner: 'EDR',
              metadata: {
                started: '',
                finished: '',
                status: 'not-started',
              },
            },
            { id }
          )
          .catch(catchAndWrapError);

        return createResponse.attributes;
      }

      throw wrapErrorIfNeeded(err, `Failed to retrieve migration state for [${id}]`);
    });
};

// TODO:PT move this to a new data access client
const updateMigrationState = async (
  soClient: SavedObjectsClientContract,
  id: typeof ARTIFACTS_MIGRATION_REF_DATA_ID | typeof RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID,
  update: ReferenceDataSavedObject<MigrationState>
): Promise<ReferenceDataSavedObject<MigrationState>> => {
  await soClient
    .update<ReferenceDataSavedObject<MigrationState>>(
      REFERENCE_DATA_SAVED_OBJECT_TYPE,
      id,
      update,
      { refresh: 'wait_for' }
    )
    .catch(catchAndWrapError);

  return update;
};

const migrateArtifactsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY, 'artifacts');
  const soClient = endpointService.savedObjects.createInternalScopedSoClient({ readonly: false });
  const migrationState = await getMigrationState(soClient, logger, ARTIFACTS_MIGRATION_REF_DATA_ID);

  if (migrationState.metadata.status !== 'not-started') {
    logger.debug(
      `Migration for endpoint artifacts in support of spaces has a status of [${migrationState.metadata.status}]. Nothing to do.`
    );
    return;
  }

  logger.info(`starting migration of endpoint artifacts in support of spaces`);

  migrationState.metadata.status = 'pending';
  migrationState.metadata.started = new Date().toISOString();
  await updateMigrationState(soClient, ARTIFACTS_MIGRATION_REF_DATA_ID, migrationState);

  const exceptionsClient = endpointService.getExceptionListsClient();
  const listIds: string[] = Object.values(ENDPOINT_ARTIFACT_LISTS).map(({ id }) => id);
  listIds.push(ENDPOINT_LIST_ID);

  logger.debug(`artifact list ids to process: ${listIds.join(', ')}`);

  const migrationStats = {
    totalItems: 0,
    itemsNeedingUpdates: 0,
    successUpdates: 0,
    failedUpdates: 0,
    artifacts: listIds.reduce((acc, listId) => {
      acc[listId] = {
        success: 0,
        failed: 0,
        errors: [],
      };

      return acc;
    }, {} as Record<string, { success: number; failed: number; errors: string[] }>),
  };
  const updateProcessor = new QueueProcessor<UpdateExceptionListItemOptions & { listId: string }>({
    batchSize: 50,
    batchHandler: async ({ data: artifactUpdates }) => {
      // TODO:PT add a `bulkUpdate()` to the exceptionsListClient

      migrationStats.itemsNeedingUpdates += artifactUpdates.length;

      await pMap(
        artifactUpdates,
        async ({ listId, ...artifactUpdate }) => {
          try {
            const updatedArtifact = await exceptionsClient.updateExceptionListItem(artifactUpdate);

            if (updatedArtifact) {
              migrationStats.successUpdates++;
              migrationStats.artifacts[listId].success++;
            }
          } catch (err) {
            migrationStats.failedUpdates++;
            migrationStats.artifacts[listId].failed++;
            migrationStats.artifacts[listId].errors.push(
              `Update to [${listId}] item ID [${artifactUpdate.itemId}] failed with: ${err.message}`
            );
          }
        },
        { stopOnError: false, concurrency: 10 }
      );
    },
  });

  await exceptionsClient
    .findExceptionListsItemPointInTimeFinder({
      listId: listIds,
      namespaceType: listIds.map(() => 'agnostic'),
      filter: [],
      perPage: undefined,
      sortField: undefined,
      sortOrder: undefined,
      maxSize: undefined,
      executeFunctionOnStream: ({ page, total, data }) => {
        logger.debug(
          `Checking page [${page}] with [${data.length}] items out of a total of [${total}] artifact entries need updates`
        );

        if (migrationStats.totalItems < total) {
          migrationStats.totalItems = total;
        }

        for (const artifact of data) {
          if (!hasArtifactOwnerSpaceId(artifact)) {
            updateProcessor.addToQueue({
              _version: undefined,
              comments: artifact.comments,
              description: artifact.description,
              entries: artifact.entries,
              expireTime: artifact.expire_time,
              id: artifact.id,
              itemId: artifact.item_id,
              listId: artifact.list_id,
              meta: artifact.meta,
              name: artifact.name,
              namespaceType: artifact.namespace_type,
              osTypes: artifact.os_types,
              type: artifact.type,
              tags: [...(artifact.tags ?? []), buildSpaceOwnerIdTag(DEFAULT_SPACE_ID)],
            });
          }
        }
      },
    })
    .catch(catchAndWrapError);

  await updateProcessor.complete();

  migrationState.metadata.status = 'complete';
  migrationState.metadata.finished = new Date().toISOString();
  migrationState.metadata.data = migrationStats;
  await updateMigrationState(soClient, ARTIFACTS_MIGRATION_REF_DATA_ID, migrationState);

  logger.info(
    `migration of endpoint artifacts in support of space done.\n${JSON.stringify(
      migrationStats,
      null,
      2
    )}`
  );
};

const migrateResponseActionsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  //
};
