/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  type ListProposalsResponse,
  PND_PROPOSALS_HISTORY_URL,
  type PndProposalRow,
} from '@kbn/pnd-common';

import type { RouteDependencies } from '../../register_routes';
import { getLiveExecutionReadAuthz } from '../../watches/watch_route_security';
import {
  buildAttackDiscoveryWorkflowsSignalHeaders,
  isAttackDiscoveryWorkflowsEnabledForSpace,
} from '../../../lib/attack_discovery_workflows_signal';
import {
  listAnsweredPndGates,
  PND_ANSWERED_GATES_MAX_RUNS,
} from '../../../lib/list_answered_pnd_gates';
import { resolveReadableAttackDiscoveryAlertIds } from '../conversations/helpers/resolve_readable_attack_discovery_alert_ids';
import { buildProposalRows } from './helpers/build_proposal_rows';
import { groupProposals } from './helpers/group_proposals';

/** Upper bound on runs read per request. */
export const PND_PROPOSAL_HISTORY_PAGE_SIZE = PND_ANSWERED_GATES_MAX_RUNS;

/** Newest answer first; a row with an unparseable timestamp sorts last. */
const byRespondedAtDesc = (a: PndProposalRow, b: PndProposalRow): number => {
  const aTime = a.respondedAt ? Date.parse(a.respondedAt) : NaN;
  const bTime = b.respondedAt ? Date.parse(b.respondedAt) : NaN;
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
};

/**
 * `GET /internal/pnd/proposals/history` — the answered gates, in the queue's own shape.
 *
 * The audit counterpart of `GET /internal/pnd/proposals`: same grouping, same row projection, same
 * space and readability rules — only the step selection differs (answered rather than parked, via
 * {@link listAnsweredPndGates}). Sharing {@link buildProposalRows} is the point: an approval must read
 * in the history exactly as the proposal read when it was pending, which a second projection built
 * from the workflow engine's own audit shape does not give.
 *
 * Rows are **not** de-duplicated by `(correlationId, gateId)` the way the queue's are. That
 * de-duplication keeps one live row per gate; here every answer is a distinct historical fact, and
 * collapsing a re-run's second answer into the first would drop an audit record.
 *
 * Security finding S3/D3: rows expose a discovery id, the gate prompt and the model's reasoning, so the
 * history is filtered to discoveries the **calling user** can read, with the same `_find?ids=` check
 * the queue uses. The space is always taken from the request, never a parameter, and never `'*'` (S9).
 */
export const registerListProposalHistoryRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_PROPOSALS_HISTORY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getLiveExecutionReadAuthz(),
      },
      summary: 'List answered PND HITL proposals grouped by recommended action',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (_context, request, response) => {
        try {
          const spaceId = getSpaceId(request);

          // When AD 2.0 is disabled in this space nothing has run, so the history is empty by design;
          // stamp the signal so the caller can name the setting rather than treat it as a bug.
          const adWorkflowsEnabled = await isAttackDiscoveryWorkflowsEnabledForSpace({
            getStartServices,
            logger,
            request,
            spaceId,
          });
          const headers = buildAttackDiscoveryWorkflowsSignalHeaders(adWorkflowsEnabled);
          if (!adWorkflowsEnabled) {
            return response.ok({ body: { groups: [], total: 0 }, headers });
          }

          const managementClient = getWorkflowsManagementClient();
          if (managementClient == null) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Workflows management API is not available' },
            });
          }

          const { answerByStepId, attackDiscoveryIdByRunId, reasoningByStepId, results } =
            await listAnsweredPndGates({
              logger,
              managementClient,
              size: PND_PROPOSAL_HISTORY_PAGE_SIZE,
              spaceId,
            });

          // S3: resolve which correlated discoveries the caller can read, as the calling user.
          const [{ http }] = await getStartServices();
          const readableAttackDiscoveryAlertIds = await resolveReadableAttackDiscoveryAlertIds({
            correlationIds: results.map(
              (step) => attackDiscoveryIdByRunId.get(step.workflowRunId) ?? ''
            ),
            http,
            request,
            spaceId,
          });

          const rows = buildProposalRows({
            attackDiscoveryIdByRunId,
            readableAttackDiscoveryAlertIds,
            reasoningByStepId,
            steps: results,
          })
            .map((row): PndProposalRow => ({ ...row, ...answerByStepId.get(row.stepExecutionId) }))
            .sort(byRespondedAtDesc);

          const body: ListProposalsResponse = { groups: groupProposals(rows), total: rows.length };

          return response.ok({ body, headers });
        } catch (error) {
          logger.error(`Failed to list PND proposal history: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list PND proposal history' },
          });
        }
      }
    );
};
