/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { isTerminalStatus, NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
} from '@kbn/management-settings-ids';
import { parseIndexPatterns } from '@kbn/streams-schema';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { filterEligibleStreams } from '../knowledge_indicators/extraction/classify_streams';
import { parseStreamNameFromConcurrencyKey } from '../../../lib/workflows/onboarding_workflow_client';

export const internalEngineActivityRoutes = createServerRoute({
  endpoint: 'GET /internal/significant_events/engine_activity',
  options: { access: 'internal', summary: 'Read detection engine progress and recent runs' },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients, getSpaceId }) => {
    const { licensing, streamsClient, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const [streams, spaceId, patterns, queryStreams] = await Promise.all([
      streamsClient.listStreams(),
      getSpaceId(request),
      uiSettingsClient.get<string>(OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS),
      uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS),
    ]);
    const watched = filterEligibleStreams({
      allStreams: streams,
      isQueryStreamsEnabled: queryStreams,
      indexPatterns: parseIndexPatterns(patterns),
    });
    const watchedNames = new Set(watched.map((stream) => stream.name));
    const readableNames = new Set(streams.map((stream) => stream.name));
    const client = server.workflowsManagement?.management.getClient(request);
    const definitions = [
      {
        workflowId: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
        kind: 'pipeline' as const,
        space: spaceId,
      },
      {
        workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
        kind: 'learning' as const,
        space: DEFAULT_SPACE_ID,
      },
      {
        workflowId: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
        kind: 'evaluation' as const,
        space: spaceId,
      },
      {
        workflowId: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
        kind: 'discovery' as const,
        space: spaceId,
      },
      {
        workflowId: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-${spaceId}`,
        kind: 'review' as const,
        space: spaceId,
      },
    ];
    const groups = await Promise.all(
      definitions.map(async (definition) => {
        if (!client) return [];
        const [recent, active] = await Promise.all([
          client.getWorkflowExecutions(
            {
              workflowId: definition.workflowId,
              size: 60,
              sortField: 'createdAt',
              sortOrder: 'desc',
              omitStepRuns: true,
            },
            definition.space
          ),
          client.getWorkflowExecutions(
            {
              workflowId: definition.workflowId,
              statuses: [...NonTerminalExecutionStatuses],
              size: 100,
              sortField: 'createdAt',
              sortOrder: 'desc',
              omitStepRuns: true,
            },
            definition.space
          ),
        ]);
        // Include older active executions even when newer completed runs fill the history window.
        const executions = [
          ...new Map([...active.results, ...recent.results].map((run) => [run.id, run])).values(),
        ];
        const permitted = executions.filter(
          (run) =>
            definition.kind !== 'learning' ||
            readableNames.has(
              parseStreamNameFromConcurrencyKey(run.concurrencyGroupKey ?? '') ?? ''
            )
        );
        return Promise.all(
          permitted.map(async (run, index) => {
            // Return active progress and the latest run details, without agent inputs or outputs.
            const detail =
              !isTerminalStatus(run.status) || index === 0
                ? await client.getWorkflowExecution(run.id, definition.space)
                : undefined;
            return {
              id: run.id,
              kind: definition.kind,
              stream:
                definition.kind === 'learning'
                  ? parseStreamNameFromConcurrencyKey(run.concurrencyGroupKey ?? '')
                  : null,
              status: run.status,
              startedAt: run.startedAt || run.createdAt,
              finishedAt: run.finishedAt || null,
              error: run.error?.message ?? null,
              active: !isTerminalStatus(run.status),
              steps: (detail?.stepExecutions ?? []).map((step) => ({
                id: step.id,
                name: step.stepId,
                type: step.stepType,
                status: step.status,
                startedAt: step.startedAt,
                finishedAt: step.finishedAt,
                error: step.error?.message,
                active: !isTerminalStatus(step.status),
              })),
            };
          })
        );
      })
    );
    return {
      available: Boolean(client),
      streams: streams.map((stream) => ({
        name: stream.name,
        description: stream.description,
        type: stream.type,
        watched: watchedNames.has(stream.name),
      })),
      runs: groups.flat().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
      asOf: new Date().toISOString(),
    };
  },
});
