/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

export const internalKIActivityRoutes = createServerRoute({
  endpoint: 'GET /internal/significant_events/knowledge_activity',
  options: { access: 'internal', summary: 'Lists retained knowledge and rule activity' },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({ query: z.object({ from: z.iso.datetime(), to: z.iso.datetime() }) }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const clients = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing: clients.licensing });
    const streams = await clients.streamsClient.listStreams();
    const knowledge = await clients.getKnowledgeIndicatorClient();
    return knowledge.getActivity(
      streams.map((stream) => stream.name),
      params.query.from,
      params.query.to
    );
  },
});
