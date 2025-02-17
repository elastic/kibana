/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestStreamDefinition,
  findInheritedLifecycle,
  isIlmLifecycle,
  isIngestStreamDefinition,
  isInheritLifecycle,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { createServerRoute } from '../../create_server_route';
import { StreamsClient } from '../../../lib/streams/client';
import { getDataStreamLifecycle } from '../../../lib/streams/stream_crud';
import { ilmStats } from '../../../lib/streams/lifecycle/ilm_stats';

const lifecycleStatsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/lifecycle/_stats',
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
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, server, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!isIngestStreamDefinition(definition)) {
      throw new Error('Lifecycle stats are only available for ingest streams');
    }

    const dataStream = await streamsClient.getDataStream(name);
    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });
    if (!isIlmLifecycle(lifecycle)) {
      throw new Error('Lifecycle stats are only available for ILM');
    }

    if (server.isServerless) {
      throw new Error('Lifecycle stats are not supported in serverless');
    }

    const { policy } = await scopedClusterClient.asCurrentUser.ilm
      .getLifecycle({ name: lifecycle.ilm.policy })
      .then((policies) => policies[lifecycle.ilm.policy]);

    const [{ indices: indicesIlmDetails }, { indices: indicesStats = {} }] = await Promise.all([
      scopedClusterClient.asCurrentUser.ilm.explainLifecycle({ index: name }),

      scopedClusterClient.asCurrentUser.indices.stats({
        index: dataStream.indices.map(({ index_name: indexName }) => indexName),
      }),
    ]);

    return ilmStats({ policy, indicesIlmDetails, indicesStats });
  },
});

const getEffectiveLifecycle = async ({
  definition,
  streamsClient,
  dataStream,
}: {
  definition: IngestStreamDefinition;
  streamsClient: StreamsClient;
  dataStream: IndicesDataStream;
}) => {
  if (isUnwiredStreamDefinition(definition)) {
    return getDataStreamLifecycle(dataStream);
  }

  if (isInheritLifecycle(definition.ingest.lifecycle)) {
    const ancestors = await streamsClient.getAncestors(definition.name);
    return findInheritedLifecycle(definition, ancestors);
  }

  return definition.ingest.lifecycle;
};

export const lifecycleRoutes = {
  ...lifecycleStatsRoute,
};
