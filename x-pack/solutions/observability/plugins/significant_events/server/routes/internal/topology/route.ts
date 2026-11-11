/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  MAX_ID_LENGTH,
  MAX_TOPOLOGY_PROVENANCE,
  type Feature,
  type TopologySnapshotProperties,
} from '@kbn/significant-events-schema';
import { TOPOLOGY_INPUT_FEATURE_TYPES } from '../../../lib/knowledge_indicators/topology/build_topology_snapshot';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  MAX_SOURCE_IDS_PER_REQUEST,
  filterReadableSourceIds,
  requestedOrAllSourceIds,
  sourceIdsQuerySchema,
} from '../../utils/resolve_source_ids';

const getTopologyRoute = createServerRoute({
  endpoint: 'GET /internal/nightshift/topology',
  options: {
    access: 'internal',
    summary: 'Get the service topology',
    description:
      'Computes the service topology from the entity and dependency knowledge indicators of the requested sources, or of every source the caller can read.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          sourceIds: sourceIdsQuerySchema(MAX_SOURCE_IDS_PER_REQUEST).describe(
            'Source ids to build the topology from'
          ),
        })
        .optional(),
    })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<TopologySnapshotProperties> => {
    const { licensing, sourcesClient, getTopologySnapshotClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const sourceIds = await filterReadableSourceIds(
      await requestedOrAllSourceIds(params?.query?.sourceIds, sourcesClient),
      sourcesClient
    );
    const topologySnapshotClient = await getTopologySnapshotClient();
    return topologySnapshotClient.get(sourceIds);
  },
});

const featureUuidSchema = lazySchema(() => z.string().min(1).max(MAX_ID_LENGTH));

const getTopologyFeaturesRoute = createServerRoute({
  endpoint: 'GET /internal/nightshift/topology/features',
  options: {
    access: 'internal',
    summary: 'Get the knowledge indicators behind topology elements',
    description:
      'Fetches the entity and dependency knowledge indicators listed in a topology provenance, from the requested sources the caller can read.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() =>
    z.object({
      query: z.object({
        sourceIds: sourceIdsQuerySchema(MAX_SOURCE_IDS_PER_REQUEST).describe(
          'Source ids the knowledge indicators belong to'
        ),
        featureUuids: z
          .union([
            featureUuidSchema.transform((uuid) => [uuid]),
            z.array(featureUuidSchema).min(1).max(MAX_TOPOLOGY_PROVENANCE),
          ])
          .describe('Knowledge indicator uuids from a topology provenance'),
      }),
    })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const { licensing, sourcesClient, getKnowledgeIndicatorClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const sourceIds = await filterReadableSourceIds(
      await requestedOrAllSourceIds(params.query.sourceIds, sourcesClient),
      sourcesClient
    );
    const kiClient = await getKnowledgeIndicatorClient();
    const { hits } = await kiClient.getFeatures(sourceIds, {
      id: params.query.featureUuids,
      type: [...TOPOLOGY_INPUT_FEATURE_TYPES],
    });
    return { features: hits };
  },
});

export const internalTopologyRoutes = {
  ...getTopologyRoute,
  ...getTopologyFeaturesRoute,
};
