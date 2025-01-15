/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, internal, notFound } from '@hapi/boom';
import { conditionSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  RootStreamImmutabilityException,
  SecurityException,
} from '../../lib/streams/errors';
import { MalformedStreamId } from '../../lib/streams/errors/malformed_stream_id';
import { validateCondition } from '../../lib/streams/helpers/condition_fields';
import { createServerRoute } from '../create_server_route';

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

      const { streamsClient } = await getScopedClients({
        request,
      });

      return await streamsClient.forkStream({
        parent: params.path.id,
        condition: params.body.condition,
        name: params.body.stream.name,
      });
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
