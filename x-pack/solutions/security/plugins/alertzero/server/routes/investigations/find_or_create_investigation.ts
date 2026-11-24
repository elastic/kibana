/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import type { FindOrCreateWorkerInvestigationResponse } from '@kbn/alertzero-common';
import {
  ALERTZERO_FIND_OR_CREATE_INVESTIGATION_URL,
  API_VERSIONS,
  FindOrCreateWorkerInvestigationRequestBody,
  INTERNAL_API_ACCESS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_WRITE } from '../../../common/constants';
import { runFindOrCreateWorkerInvestigation } from '../../services/investigations/find_or_create_worker_investigation';
import {
  ALERTZERO_TELEMETRY_EVENTS,
  buildWorkerInvestigationReopenedPayload,
} from '../../telemetry';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

/** The review workflow each Worker runs, which is the only caller whose reopen counts. */
const REVIEW_WORKFLOW_ID_BY_WORKER: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
};

/**
 * Mints or verifies the one Investigation a Detection Watch review keeps per subject. The
 * review workflows cannot compute the deterministic id (a uuidv5), so they call this instead
 * of `ai.conversation.create`, which would open a new Investigation on every re-review.
 */
export const registerFindOrCreateWorkerInvestigationRoute = ({
  router,
  logger,
  getSpaceId,
  getAgentBuilderConversations,
  getWorkflowsManagement,
  reportTelemetryEvent,
}: RouteDependencies): void => {
  /**
   * Whether the execution the body names is a run of the named Worker's review workflow.
   * The route does not otherwise verify its caller, so a reopen is only counted as the
   * Worker's when the run it claims to be really is one of that Worker's reviews.
   */
  const isReviewExecution = async ({
    workerId,
    workflowExecutionId,
    spaceId,
    request,
  }: {
    workerId: string;
    workflowExecutionId: string | undefined;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<boolean> => {
    const management = getWorkflowsManagement();
    if (management === undefined || workflowExecutionId === undefined) {
      return false;
    }
    const execution = await management.getWorkflowExecution(workflowExecutionId, spaceId, request);
    if (execution === null) {
      return false;
    }
    const reviewWorkflowId = REVIEW_WORKFLOW_ID_BY_WORKER[workerId];
    return (
      execution.workflowId === reviewWorkflowId ||
      execution.originManagedWorkflowId === reviewWorkflowId
    );
  };

  router.versioned
    .post({
      path: ALERTZERO_FIND_OR_CREATE_INVESTIGATION_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          // Both: the Agent Builder conversation routes require their feature privilege and
          // the scoped conversation client does not check it, so `alertzero_write` alone
          // would let a caller without Agent Builder access mint or reopen a public
          // Investigation here. The Worker roles carry both.
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE, apiPrivileges.readAgentBuilder],
        },
      },
      summary: 'Find or create a Worker Investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(FindOrCreateWorkerInvestigationRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const conversations = getAgentBuilderConversations();
          const conversationClient = await conversations.getScopedClient({ request });

          const { workerId, subjectId, title, description, workflowExecutionId } = request.body;

          const body: FindOrCreateWorkerInvestigationResponse =
            await runFindOrCreateWorkerInvestigation(
              { spaceId, workerId, subjectId, title, description, workflowExecutionId },
              {
                conversationClient,
                logger,
                // Reported as the Worker the body names, but only when the execution the
                // body names is a run of that Worker's review, so a hand-made call to this
                // route cannot count as a Worker-driven reopen.
                onReopened: async (investigationId) => {
                  const verified = await isReviewExecution({
                    workerId,
                    workflowExecutionId,
                    spaceId,
                    request,
                  });
                  if (!verified) {
                    logger.debug(
                      `investigations/find_or_create: not reporting the reopen of ${investigationId}: execution ${
                        workflowExecutionId ?? '(none)'
                      } is not a ${workerId} review`
                    );
                    return;
                  }
                  reportTelemetryEvent(
                    ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened,
                    buildWorkerInvestigationReopenedPayload({
                      investigationId,
                      spaceId,
                      workerId,
                    })
                  );
                },
              }
            );
          return response.ok({ body });
        } catch (err) {
          logger.error(`investigations/find_or_create route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Find-or-create Investigation failed' },
          });
        }
      })
    );
};
