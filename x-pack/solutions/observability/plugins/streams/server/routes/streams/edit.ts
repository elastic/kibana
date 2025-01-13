/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { badRequest, internal, notFound } from '@hapi/boom';
import {
  isRootStream,
  isWiredStream,
  isWiredStreamConfig,
  streamConfigDefinitionSchema,
  StreamDefinition,
  WiredStreamConfigDefinition,
  WiredStreamDefinition,
} from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  RootStreamImmutabilityException,
  SecurityException,
} from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import {
  syncStream,
  readStream,
  checkStreamExists,
  validateAncestorFields,
  validateDescendantFields,
} from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { getParentId } from '../../lib/streams/helpers/hierarchy';
import { MalformedChildren } from '../../lib/streams/errors/malformed_children';
import { AssetClient } from '../../lib/streams/assets/asset_client';
import { validateCondition } from '../../lib/streams/helpers/condition_fields';

export const editStreamRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: streamConfigDefinitionSchema,
  }),
  handler: async ({ params, logger, request, getScopedClients }) => {
    try {
      const { scopedClusterClient, assetClient } = await getScopedClients({ request });
      const streamDefinition: StreamDefinition = { stream: params.body, name: params.path.id };

      if (!isWiredStream(streamDefinition)) {
        await syncStream({
          scopedClusterClient,
          definition: streamDefinition,
          rootDefinition: undefined,
          logger,
          assetClient,
        });
        return { acknowledged: true };
      }

      const currentStreamDefinition = (await readStream({
        scopedClusterClient,
        id: params.path.id,
      })) as WiredStreamDefinition;

      if (isRootStream(streamDefinition)) {
        await validateRootStreamChanges(
          scopedClusterClient,
          currentStreamDefinition,
          streamDefinition
        );
      }

      await validateStreamChildren(
        scopedClusterClient,
        currentStreamDefinition,
        params.body.ingest.routing
      );

      if (isWiredStreamConfig(params.body)) {
        await validateAncestorFields(
          scopedClusterClient,
          params.path.id,
          params.body.ingest.wired.fields
        );
        await validateDescendantFields(
          scopedClusterClient,
          params.path.id,
          params.body.ingest.wired.fields
        );
      }

      const parentId = getParentId(params.path.id);
      let parentDefinition: WiredStreamDefinition | undefined;

      // always need to go from the leaves to the parent when syncing ingest pipelines, otherwise data
      // will be routed before the data stream is ready

      for (const child of streamDefinition.stream.ingest.routing) {
        const streamExists = await checkStreamExists({
          scopedClusterClient,
          id: child.name,
        });
        if (streamExists) {
          continue;
        }
        // create empty streams for each child if they don't exist
        const childDefinition: WiredStreamDefinition = {
          name: child.name,
          stream: {
            ingest: {
              processing: [],
              routing: [],
              wired: {
                fields: {},
              },
            },
          },
        };

        await syncStream({
          scopedClusterClient,
          assetClient,
          definition: childDefinition,
          logger,
        });
      }

      await syncStream({
        scopedClusterClient,
        definition: { ...streamDefinition, name: params.path.id },
        rootDefinition: parentDefinition,
        logger,
        assetClient,
      });

      if (parentId) {
        parentDefinition = await updateParentStream(
          scopedClusterClient,
          assetClient,
          parentId,
          params.path.id,
          logger
        );
      }

      return { acknowledged: true };
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId ||
        e instanceof RootStreamImmutabilityException
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
  },
});

async function updateParentStream(
  scopedClusterClient: IScopedClusterClient,
  assetClient: AssetClient,
  parentId: string,
  id: string,
  logger: Logger
) {
  const parentDefinition = await readStream({
    scopedClusterClient,
    id: parentId,
  });

  if (!parentDefinition.stream.ingest.routing.some((child) => child.name === id)) {
    // add the child to the parent stream with an empty condition for now
    parentDefinition.stream.ingest.routing.push({
      name: id,
      condition: undefined,
    });

    await syncStream({
      scopedClusterClient,
      assetClient,
      definition: parentDefinition,
      logger,
    });
  }
  return parentDefinition as WiredStreamDefinition;
}

async function validateStreamChildren(
  scopedClusterClient: IScopedClusterClient,
  currentStreamDefinition: WiredStreamDefinition,
  children: WiredStreamConfigDefinition['ingest']['routing']
) {
  try {
    const oldChildren = currentStreamDefinition.stream.ingest.routing.map((child) => child.name);
    const newChildren = new Set(children.map((child) => child.name));
    children.forEach((child) => {
      validateCondition(child.condition);
    });
    if (oldChildren.some((child) => !newChildren.has(child))) {
      throw new MalformedChildren(
        'Cannot remove children from a stream, please delete the stream instead'
      );
    }
  } catch (e) {
    // Ignore if the stream does not exist, but re-throw if it's another error
    if (!(e instanceof DefinitionNotFound)) {
      throw e;
    }
  }
}

/*
 * Changes to mappings (fields) and processing rules are not allowed on the root stream.
 * Changes to routing rules are allowed.
 */
async function validateRootStreamChanges(
  scopedClusterClient: IScopedClusterClient,
  currentStreamDefinition: WiredStreamDefinition,
  nextStreamDefinition: WiredStreamDefinition
) {
  const hasFieldChanges = !isEqual(
    currentStreamDefinition.stream.ingest.wired.fields,
    nextStreamDefinition.stream.ingest.wired.fields
  );

  if (hasFieldChanges) {
    throw new RootStreamImmutabilityException('Root stream fields cannot be changed');
  }

  const hasProcessingChanges = !isEqual(
    currentStreamDefinition.stream.ingest.processing,
    nextStreamDefinition.stream.ingest.processing
  );

  if (hasProcessingChanges) {
    throw new RootStreamImmutabilityException('Root stream processing rules cannot be changed');
  }
}
