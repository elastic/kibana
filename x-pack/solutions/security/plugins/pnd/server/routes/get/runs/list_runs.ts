/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ListRunsRequestQuery,
  type ListRunsResponse,
  PND_RUNS_URL,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import type { RouteDependencies } from '../../register_routes';
import { getLiveExecutionReadAuthz } from '../../watches/watch_route_security';
import {
  buildAttackDiscoveryWorkflowsSignalHeaders,
  isAttackDiscoveryWorkflowsEnabledForSpace,
} from '../../../lib/attack_discovery_workflows_signal';
import { resolveReadableAttackDiscoveryAlertIds } from '../conversations/helpers/resolve_readable_attack_discovery_alert_ids';
import { buildRunRows } from './helpers/build_run_rows';
import { correlateExecutions } from './helpers/correlate_executions';
import { resolvePendingGateStepExecutionIds } from './helpers/resolve_pending_gate_step_execution_ids';

/**
 * The two PND orchestrator workflows whose executions are PND "runs". The Watch Floor drives the
 * Signal Triage → Investigation → Incident Response lifecycle (the lane moved there from the Deep
 * Watch in kibana-phf4.5, ADR-015); the Detection Watch drafts the post-incident rule tuning. The
 * other three system watches are not orchestrators in this slice.
 */
const ORCHESTRATOR_WORKFLOW_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
] as const;

/**
 * `GET /internal/pnd/runs` — recent PND orchestrator runs in the space, newest first.
 *
 * The PND equivalent of Attack Discovery 2.0's "Generations" list: it merges the recent executions
 * of **both** orchestrator workflows, sorts them newest-first, and projects each into a `PndRun`
 * card with a server-composed summary, a pending-gate badge count, and a Workflows-app deep link.
 *
 * Execution `context` is unmapped (`dynamic: false`), so the Attack Discovery correlation is
 * retrieve-then-filter (see {@link correlateExecutions}), never a term query. A run row exposes a
 * discovery id and summary, so the list is filtered to discoveries the **calling user** can read via
 * the same `_find?ids=` check `_derive` uses (security finding S3, shared through
 * {@link resolveReadableAttackDiscoveryAlertIds}); the space is always taken from the request, never
 * a parameter, and never `'*'` (S9). Dismissal is deliberately client-side — PND has no event writer
 * to persist it — so every run is returned and the UI filters dismissed rows.
 *
 * A run parked at exactly one HITL gate deep-links straight to that gate's step execution (plan
 * F1); with none or several the link stays at the execution level.
 */
export const registerListRunsRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_RUNS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getLiveExecutionReadAuthz(),
      },
      summary: 'List recent PND orchestrator runs in the space',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListRunsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const spaceId = getSpaceId(request);

          // AD 2.0 disabled in this space → no orchestrator runs by design; stamp the signal so the
          // caller can name the setting instead of showing an empty list that reads like a bug.
          const adWorkflowsEnabled = await isAttackDiscoveryWorkflowsEnabledForSpace({
            getStartServices,
            logger,
            request,
            spaceId,
          });
          const headers = buildAttackDiscoveryWorkflowsSignalHeaders(adWorkflowsEnabled);
          if (!adWorkflowsEnabled) {
            return response.ok({ body: { runs: [], total: 0 }, headers });
          }

          const managementClient = getWorkflowsManagementClient();
          if (managementClient == null) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Workflows management API is not available' },
            });
          }

          const { end, size, start, watchId } = request.query;

          // A `watchId` filter restricts to a single orchestrator; a non-orchestrator id yields none.
          const watchIds =
            watchId != null
              ? ORCHESTRATOR_WORKFLOW_IDS.filter((id) => id === watchId)
              : ORCHESTRATOR_WORKFLOW_IDS;

          const [correlated, pendingGateStepExecutionIdsByRunId] = await Promise.all([
            correlateExecutions({
              end,
              logger,
              managementClient,
              request,
              size,
              spaceId,
              start,
              watchIds,
            }),
            resolvePendingGateStepExecutionIds({ logger, managementClient, spaceId }),
          ]);

          // S3: resolve which correlated discoveries the caller can read, as the calling user —
          // the same shared primitive the proposals queue uses, never a second copy.
          const [{ http }] = await getStartServices();
          const readableAttackDiscoveryAlertIds = await resolveReadableAttackDiscoveryAlertIds({
            correlationIds: correlated.map((c) => c.correlationId),
            http,
            request,
            spaceId,
          });

          const runs = buildRunRows({
            correlated,
            pendingGateStepExecutionIdsByRunId,
            readableAttackDiscoveryAlertIds,
          });

          const body: ListRunsResponse = { runs, total: runs.length };

          return response.ok({ body, headers });
        } catch (error) {
          logger.error(`Failed to list PND runs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list PND runs' },
          });
        }
      }
    );
};
