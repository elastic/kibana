/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { resetSourceKnowledge } from './reconcile_source_catalog';

const resetSourceKnowledgeRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/knowledge_indicators/_reset',
  options: {
    access: 'internal',
    summary: 'Reset the knowledge of a source',
    description:
      'Cancels the onboarding run of a source, then deletes its owned rules, queries and knowledge indicators. The source and its view are kept.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    // A source id. The param keeps the name of the other `/internal/streams/{streamName}` KI routes.
    path: z.object({ streamName: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowClients,
  }): Promise<{ acknowledged: true }> => {
    const { getKnowledgeIndicatorClient, licensing, sourcesClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const { source } = await sourcesClient.get(params.path.streamName);
    await resetSourceKnowledge({
      source,
      kiClient: await getKnowledgeIndicatorClient(),
      onboardingClient: workflowClients.streamsKIsOnboardingClient,
      request,
    });

    return { acknowledged: true };
  },
});

export const resetSourceKnowledgeRoutes = {
  ...resetSourceKnowledgeRoute,
};
