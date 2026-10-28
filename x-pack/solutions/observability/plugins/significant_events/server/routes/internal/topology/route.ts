/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { TopologySnapshotProperties } from '@kbn/significant-events-schema';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  MAX_SOURCE_IDS_PER_REQUEST,
  filterReadableSourceIds,
  requestedOrAllSourceIds,
  sourceIdsQuerySchema,
} from '../../utils/resolve_source_ids';

const getTopologyRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/topology',
  options: {
    access: 'internal',
    summary: 'Get the service topology',
    description:
      'Computes the service topology from the entity, infrastructure and dependency knowledge indicators of the requested sources, or of every source the caller can read.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        sourceIds: sourceIdsQuerySchema(MAX_SOURCE_IDS_PER_REQUEST).describe(
          'Source ids to build the topology from'
        ),
      })
      .optional(),
  }),
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
      await requestedOrAllSourceIds(params.query?.sourceIds, sourcesClient),
      sourcesClient
    );
    const topologySnapshotClient = await getTopologySnapshotClient();
    return topologySnapshotClient.get(sourceIds);
  },
});

export const internalTopologyRoutes = {
  ...getTopologyRoute,
};
