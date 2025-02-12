/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIlmLifecycle, isIngestStreamDefinition } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import {
  IlmExplainLifecycleLifecycleExplain,
  IlmPolicy,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { createServerRoute } from '../../create_server_route';

interface IlmPhase {
  size_in_bytes: number;
  move_after?: string;
}

interface IlmSummary {
  hot?: IlmPhase;
  warm?: IlmPhase;
  cold?: IlmPhase;
  frozen?: IlmPhase;
  delete?: {};
}

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

    const lifecycle = definition.ingest.lifecycle;
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
        index: dataStream.indices.map(({ index_name }) => index_name),
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
  const orderedPhases = [
    { name: 'hot' as const, phase: policy.phases.hot ?? {} },
    { name: 'warm' as const, phase: policy.phases.warm },
    { name: 'cold' as const, phase: policy.phases.cold },
    { name: 'frozen' as const, phase: policy.phases.frozen },
    { name: 'delete' as const, phase: policy.phases.delete },
  ].filter(({ phase }) => !!phase);

  return orderedPhases.reduce((phases, phase, index) => {
    if (phase.name === 'delete') {
      phases[phase.name] = {};
      return phases;
    }

    const sizeInBytes = ilmDetails
      .filter((detail) => detail.managed && detail.phase === phase.name)
      .map((detail) => indicesStats[detail.index!])
      .reduce((size, stats) => size + (stats?.total?.store?.size_in_bytes ?? 0), 0);
    const nextPhase = orderedPhases[index + 1];
    phases[phase.name] = {
      size_in_bytes: sizeInBytes,
      move_after: nextPhase?.phase?.min_age?.toString(),
    };
    return phases;
  }, {} as IlmSummary);
};

export const lifecycleRoutes = {
  ...lifecycleStatsRoute,
};
