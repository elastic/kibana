/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  ALERTZERO_API_PRIVILEGE_WRITE,
  HUNT_HANDOFF_CLEANUP_RETRY_URL,
} from '../../../common/constants';
import type { HuntHandoffCleanupRetryResponse } from '../../../common/hunt_library';
import {
  HANDOFF_CLEANUP_EXHAUSTED,
  HANDOFF_CLEANUP_REQUIRED,
  HANDOFF_PENDING,
  isStalePendingHandoff,
  runHandoffCleanup,
} from '../../hunt_library/handoff_cleanup';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

const STUCK_OUTCOMES = [HANDOFF_CLEANUP_EXHAUSTED, HANDOFF_CLEANUP_REQUIRED, HANDOFF_PENDING];

/**
 * Operator remediation for a Hunt session whose handoff did not complete. Needs AlertZero All.
 * It re-queues an exhausted session and runs the cleanup now, under the operator's own request,
 * so there are no direct label edits. A pending handoff that is still fresh is left alone.
 */
export const registerHuntHandoffCleanupRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkflowsManagement,
  getAgentBuilderConversations,
  getAgentBuilderAttachments,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: HUNT_HANDOFF_CLEANUP_RETRY_URL,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE] } },
      summary: 'Retry the cleanup of a Hunt session whose handoff did not complete',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({ executionId: schema.string({ minLength: 1, maxLength: 128 }) }),
          },
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }

        try {
          const spaceId = getSpaceId(request);
          const { executionId } = request.body;

          let labels: Readonly<Record<string, string>> | undefined;
          for (const outcome of STUCK_OUTCOMES) {
            const executions = await management.findExecutionsByLabel({
              workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
              key: 'hunt.outcome',
              value: outcome,
              spaceId,
              request,
              size: 100,
            });
            labels = executions.find(({ id }) => id === executionId)?.labels;
            if (labels) break;
          }
          if (!labels) {
            return response.notFound({ body: { message: 'No stuck handoff for this execution' } });
          }
          if (
            labels['hunt.outcome'] === HANDOFF_PENDING &&
            !isStalePendingHandoff(labels, new Date())
          ) {
            return response.conflict({
              body: {
                message: 'This handoff is still in progress',
                attributes: { reason: 'in_progress' },
              },
            });
          }

          // An exhausted session starts over: the counter lives in a label, so reset it first.
          if (labels['hunt.outcome'] === HANDOFF_CLEANUP_EXHAUSTED) {
            labels = {
              ...labels,
              'hunt.outcome': HANDOFF_CLEANUP_REQUIRED,
              'hunt.reason_code': '-',
            };
          }

          const result = await runHandoffCleanup({
            management,
            conversations: await getAgentBuilderConversations().getScopedClient({ request }),
            attachments: await getAgentBuilderAttachments().getScopedClient({ request }),
            logger,
            spaceId,
            executionId,
            labels,
          });
          const body: HuntHandoffCleanupRetryResponse = { result };
          return response.ok({ body });
        } catch (err) {
          logger.error(`Failed to retry Hunt handoff cleanup: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to retry the handoff cleanup' },
          });
        }
      })
    );
};
