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
  isWiredStream,
  isWiredStreamConfig,
  streamConfigDefinitionSchema,
  StreamDefinition,
  WiredStreamConfigDefinition,
  WiredStreamDefinition,
  ListStreamsResponse,
  FieldDefinitionConfig,
  isIngestStream,
  ReadStreamDefinition,
} from '@kbn/streams-schema';
import { getParentId } from '../../../lib/streams/helpers/hierarchy';
import { MalformedStreamId } from '../../../lib/streams/errors/malformed_stream_id';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';
import {
  syncStream,
  readStream,
  listStreams,
  readAncestors,
  checkStreamExists,
  validateAncestorFields,
  validateDescendantFields,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
} from '../../../lib/streams/stream_crud';
import { MalformedChildren } from '../../../lib/streams/errors/malformed_children';
import { validateCondition } from '../../../lib/streams/helpers/condition_fields';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}',
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
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<ReadStreamDefinition> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      // TODO: I have no idea why I can just do `isIngestStream` here but when I do,
      // streamEntity becomes `streamEntity: never` in the statements afterwards
      if (!isWiredStream(streamEntity) && isIngestStream(streamEntity)) {
        return {
          ...streamEntity,
          inherited_fields: {},
        };
      }

      const { ancestors } = await readAncestors({
        id: streamEntity.name,
        scopedClusterClient,
      });

      const body = {
        ...streamEntity,
        inherited_fields: ancestors.reduce((acc, def) => {
          Object.entries(def.stream.ingest.wired.fields).forEach(([key, fieldDef]) => {
            acc[key] = { ...fieldDef, from: def.name };
          });
          return acc;
          // TODO: replace this with a proper type
        }, {} as Record<string, FieldDefinitionConfig & { from: string }>),
      };

      return body;
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams',
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
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<ListStreamsResponse> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      return listStreams({ scopedClusterClient });
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

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
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamDefinition: StreamDefinition = { stream: params.body, name: params.path.id };

      if (!isWiredStream(streamDefinition)) {
        await syncStream({
          scopedClusterClient,
          definition: streamDefinition,
          rootDefinition: undefined,
          logger,
        });
        return { acknowledged: true };
      }

      await validateStreamChildren(scopedClusterClient, params.path.id, params.body.ingest.routing);
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
          definition: childDefinition,
          logger,
        });
      }

      await syncStream({
        scopedClusterClient,
        definition: { ...streamDefinition, name: params.path.id },
        rootDefinition: parentDefinition,
        logger,
      });

      if (parentId) {
        parentDefinition = await updateParentStreamAfterEdit(
          scopedClusterClient,
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
        e instanceof MalformedStreamId
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
  },
});

async function updateParentStreamAfterEdit(
  scopedClusterClient: IScopedClusterClient,
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
      definition: parentDefinition,
      logger,
    });
  }
  return parentDefinition as WiredStreamDefinition;
}

async function validateStreamChildren(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  children: WiredStreamConfigDefinition['ingest']['routing']
) {
  try {
    const oldDefinition = await readStream({
      scopedClusterClient,
      id,
    });
    const oldChildren = oldDefinition.stream.ingest.routing.map((child) => child.name);
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

export const deleteStreamRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}',
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
  }),
  handler: async ({
    params,
    logger,
    request,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      await deleteStream(scopedClusterClient, params.path.id, logger);

      return { acknowledged: true };
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
  },
});

export async function deleteStream(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  logger: Logger
) {
  try {
    const definition = await readStream({ scopedClusterClient, id });
    if (!isWiredStream(definition)) {
      await deleteUnmanagedStreamObjects({ scopedClusterClient, id, logger });
      return;
    }

    const parentId = getParentId(id);
    if (!parentId) {
      throw new MalformedStreamId('Cannot delete root stream');
    }

    // need to update parent first to cut off documents streaming down
    await updateParentStreamAfterDelete(scopedClusterClient, id, parentId, logger);
    for (const child of definition.stream.ingest.routing) {
      await deleteStream(scopedClusterClient, child.name, logger);
    }
    await deleteStreamObjects({ scopedClusterClient, id, logger });
  } catch (e) {
    if (e instanceof DefinitionNotFound) {
      logger.debug(`Stream definition for ${id} not found.`);
    } else {
      throw e;
    }
  }
}

async function updateParentStreamAfterDelete(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  parentId: string,
  logger: Logger
) {
  const parentDefinition = await readStream({
    scopedClusterClient,
    id: parentId,
  });

  parentDefinition.stream.ingest.routing = parentDefinition.stream.ingest.routing.filter(
    (child) => child.name !== id
  );

  await syncStream({
    scopedClusterClient,
    definition: parentDefinition,
    logger,
  });
  return parentDefinition;
}

export const crudRoutes = {
  ...readStreamRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
