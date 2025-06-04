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
import {
  buildSpaceOwnerIdTag,
  hasArtifactOwnerSpaceId,
} from '../../../common/endpoint/service/artifacts/utils';
import { catchAndWrapError } from '../utils';
import { QueueProcessor } from '../utils/queue_processor';
import type { EndpointAppContextService } from '../endpoint_app_context_services';

const LOGGER_KEY = 'migrateEndpointDataToSupportSpaces';

export const migrateEndpointDataToSupportSpaces = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY);

  if (!endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    logger.debug('Space awareness feature flag is disabled. Nothing to do.');
    return;
  }

  await migrateArtifactsToSpaceAware(endpointService);
};

const migrateArtifactsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY, 'artifacts');

  // TODO:PT need to have mechanism that can tells us if migration was already run and exit if so.

  logger.info(`starting migration of endpoint artifacts in support of spaces`);

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

  logger.info(
    `migration of endpoint artifacts in support of space done.\n${JSON.stringify(
      migrationStats,
      null,
      2
    )}`
  );
};
