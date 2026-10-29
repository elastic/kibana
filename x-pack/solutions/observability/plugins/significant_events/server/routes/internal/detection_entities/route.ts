/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import type { DetectionEntitiesResponse } from '../../../../common/detection_entities';
import { getLiveEntities } from '../../../lib/significant_events/entities/get_live_entities';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { filterReadableSourceIds } from '../../utils/resolve_source_ids';
import { listAllSources } from '../../utils/list_all_sources';

const detectionEntitiesRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/detection/_entities',
  options: {
    access: 'internal',
    summary: 'Get detection entities',
    description: 'Get live entities with rule and active event counts for the time range.',
  },
  security: {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] },
  },
  params: lazySchema(() =>
    z.object({ query: z.object({ from: isoDateTime(), to: isoDateTime() }) })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<DetectionEntitiesResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;
    await assertSignificantEventsAccess({ server, licensing });

    const sources = await listAllSources(sourcesClient);
    const sourceIds = await filterReadableSourceIds(
      sources.map(({ id }) => id),
      sourcesClient
    );
    const [knowledgeIndicatorClient, eventClient] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getEventSearchClient(),
    ]);
    const [{ entities, truncated }, queryLinks] = await Promise.all([
      getLiveEntities(knowledgeIndicatorClient, sourceIds),
      knowledgeIndicatorClient.getQueryLinks(sourceIds, { ruleUnbacked: 'exclude' }),
    ]);
    const entityIds = entities.map(({ id }) => id);
    const liveIds = new Set(entityIds);
    const rulesByEntity = new Map<string, number>();
    let unassignedRules = 0;
    for (const { query } of queryLinks) {
      const linkedIds = new Set(
        (query.features ?? []).map(({ id }) => id).filter((id) => liveIds.has(id))
      );
      if (linkedIds.size === 0) {
        unassignedRules++;
      }
      for (const id of linkedIds) {
        rulesByEntity.set(id, (rulesByEntity.get(id) ?? 0) + 1);
      }
    }
    const eventCounts = await eventClient.countActiveEventsByEntity(params.query, entityIds);
    return {
      entities: entities.map((entity) => ({
        ...entity,
        rules: rulesByEntity.get(entity.id) ?? 0,
        active_events: Object.hasOwn(eventCounts.entities, entity.id)
          ? eventCounts.entities[entity.id]
          : 0,
      })),
      unassigned: truncated
        ? null
        : { rules: unassignedRules, active_events: eventCounts.unassigned },
      truncated,
    };
  },
});

export const internalDetectionEntitiesRoutes = { ...detectionEntitiesRoute };
