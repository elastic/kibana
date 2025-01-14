/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal, notFound } from '@hapi/boom';
import {
  conditionSchema,
  isChildOf,
  isWiredReadStream,
  WiredStreamDefinition,
} from '@kbn/streams-schema';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { syncStream, readStream, validateAncestorFields } from '../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { validateCondition } from '../../lib/streams/helpers/condition_fields';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/_fork',
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
    body: z.object({ stream: z.object({ name: z.string() }), condition: conditionSchema }),
  }),
  handler: async ({
    params,
    logger,
    request,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      if (!params.body.condition) {
        throw new ForkConditionMissing('You must provide a condition to fork a stream');
      }

      validateCondition(params.body.condition);

      const { scopedClusterClient, assetClient } = await getScopedClients({ request });

      const rootDefinition = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      if (!isWiredReadStream(rootDefinition)) {
        throw new MalformedStreamId('Cannot fork a stream that is not managed');
      }

      const childDefinition: WiredStreamDefinition = {
        ...params.body.stream,
        stream: { ingest: { processing: [], routing: [], wired: { fields: {} } } },
      };

      // check whether root stream has a child of the given name already
      if (
        rootDefinition.stream.ingest.routing.some((child) => child.name === childDefinition.name)
      ) {
        throw new MalformedStreamId(
          `The stream with ID (${params.body.stream.name}) already exists as a child of the parent stream`
        );
      }

      if (!isChildOf(rootDefinition.name, childDefinition.name)) {
        throw new MalformedStreamId(
          `The ID (${params.body.stream.name}) from the new stream must start with the parent's id (${rootDefinition.name}), followed by a dot and a name`
        );
      }

      await validateAncestorFields(
        scopedClusterClient,
        childDefinition.name,
        childDefinition.stream.ingest.wired.fields
      );

      // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready
      await syncStream({
        scopedClusterClient,
        assetClient,
        definition: childDefinition,
        rootDefinition,
        logger,
      });

      rootDefinition.stream.ingest.routing.push({
        name: params.body.stream.name,
        condition: params.body.condition,
      });

      await syncStream({
        scopedClusterClient,
        assetClient,
        definition: rootDefinition,
        rootDefinition,
        logger,
      });

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
