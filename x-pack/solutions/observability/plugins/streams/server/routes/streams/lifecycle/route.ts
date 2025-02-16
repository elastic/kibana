/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, pick } from 'lodash';
import {
  IlmPolicyPhases,
  IngestStreamDefinition,
  findInheritedLifecycle,
  isIlmLifecycle,
  isIngestStreamDefinition,
  isInheritLifecycle,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import {
  IlmExplainLifecycleLifecycleExplain,
  IlmPolicy,
  IlmPhase,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { createServerRoute } from '../../create_server_route';
import { StreamsClient } from '../../../lib/streams/client';
import { getDataStreamLifecycle } from '../../../lib/streams/stream_crud';

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
      throw new Error(`[${name}] is not an ingest stream`);
    }

    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient });
    if (!isIlmLifecycle(lifecycle)) {
      throw new Error(`Only ilm lifecycle`);
    }

    if (server.isServerless) {
      throw new Error(`lifecycle/_stats is not supported in serverless`);
    }

    const dataStream = await streamsClient.getDataStream(name);
    const { policy } = await scopedClusterClient.asCurrentUser.ilm
      .getLifecycle({
        name: lifecycle.ilm.policy,
      })
      .then((policies) => policies[lifecycle.ilm.policy]);

    const [ilmDetails, { indices: indicesStats = {} }] = await Promise.all([
      scopedClusterClient.asCurrentUser.ilm
        .explainLifecycle({
          index: name,
        })
        .then(({ indices }) => Object.values(indices)),

      scopedClusterClient.asCurrentUser.indices.stats({
        index: dataStream.indices.map(({ index_name: indexName }) => indexName),
      }),
    ]);

    return ilmSummary(policy, ilmDetails, indicesStats);
  },
});

const ilmSummary = (
  policy: IlmPolicy,
  ilmDetails: IlmExplainLifecycleLifecycleExplain[],
  indicesStats: Record<string, IndicesStatsIndicesStats>
) => {
  const phaseWithName = (name: keyof IlmPolicyPhases, phase?: IlmPhase) => {
    if (!phase) return undefined;
    return { ...pick(phase, ['min_age']), name };
  };

  const orderedPhases = compact([
    phaseWithName('hot' as const, policy.phases.hot),
    phaseWithName('warm' as const, policy.phases.warm),
    phaseWithName('cold' as const, policy.phases.cold),
    phaseWithName('frozen' as const, policy.phases.frozen),
    phaseWithName('delete' as const, policy.phases.delete),
  ]);

  return orderedPhases.reduce((phases, phase) => {
    if (phase.name === 'delete') {
      phases[phase.name] = { name: phase.name, min_age: phase.min_age!.toString() };
      return phases;
    }

    const sizeInBytes = ilmDetails
      .filter((detail) => detail.managed && detail.phase === phase.name)
      .map((detail) => indicesStats[detail.index!])
      .reduce((size, stats) => size + (stats?.total?.store?.size_in_bytes ?? 0), 0);

    phases[phase.name] = {
      name: phase.name,
      size_in_bytes: sizeInBytes,
      min_age: phase.min_age?.toString(),
    };
    return phases;
  }, {} as IlmPolicyPhases);
};

const getEffectiveLifecycle = async ({
  definition,
  streamsClient,
}: {
  definition: IngestStreamDefinition;
  streamsClient: StreamsClient;
}) => {
  if (!isInheritLifecycle(definition.ingest.lifecycle)) {
    return definition.ingest.lifecycle;
  }

  if (isWiredStreamDefinition(definition)) {
    const ancestors = await streamsClient.getAncestors(definition.name);
    return findInheritedLifecycle(definition, ancestors);
  }

  const dataStream = await streamsClient.getDataStream(definition.name);
  return getDataStreamLifecycle(dataStream);
};

export const lifecycleRoutes = {
  ...lifecycleStatsRoute,
};
