/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EmitDetectionChangeSignalRequestBody,
  type EmitDetectionChangeSignalResponse,
  INTERNAL_API_ACCESS,
  PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_PROPOSALS_RESPOND } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { emitDetectionChangeSignal } from '../proposals/helpers/emit_detection_change_signal';
import { resolveEmitDetectionChangeTarget } from './helpers/resolve_emit_detection_change';

/**
 * `POST /internal/pnd/signals/_detection_change` — emit one coverage-gap claim for a concluded
 * investigation that never parked a HITL gate.
 *
 * The Watch Floor calls this from its `not_an_incident` branch with `on-failure: { continue: true }`,
 * so a signalling failure cannot fail the run. HITL terminals emit from `_respond` instead.
 *
 * Security finding S1/D1: this route starts the Post-Incident watch via `emitEvent`, so it requires
 * BOTH the PND respond privilege AND the Workflows `execute` privilege — the same pair `_respond`
 * uses. The respond grant alone must not be a workflow-trigger primitive.
 *
 * `sourceWatchId` is stamped as Watch Floor rather than taken from the body: this route exists for
 * that one YAML branch, and a caller-supplied watch id would let a holder of the respond privilege
 * spoof a producer the Post-Incident allow-list accepts. The investigation conversation is cited
 * because this path never opens an incident.
 *
 * The body is then bound to a persisted Floor run in the request space: `sourceRunId` must exist,
 * belong to Watch Floor, and carry the same correlation id the body claims. The discovery is
 * resolved as the caller (S3). Every bind refusal is a 404. The Floor run is not required to be
 * completed — YAML emits before `not_an_incident` terminates.
 *
 * Best-effort (finding R4): once the bind succeeds, the handler always answers 200 with `{ emitted }`.
 * A Workflows failure is `emitted: false`, never a 500 that would abort the Floor.
 */
export const registerEmitDetectionChangeSignalRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [
            PND_API_PRIVILEGE_PROPOSALS_RESPOND,
            WorkflowsManagementApiActions.execute,
          ],
        },
      },
      summary: 'Emit a PND coverage-gap claim for a concluded investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EmitDetectionChangeSignalRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        const { correlationId, gapDescription, sourceRunId } = request.body;
        const spaceId = getSpaceId(request);

        const managementClient = getWorkflowsManagementClient();
        if (managementClient == null) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows management API is not available' },
          });
        }

        const [{ http }, { workflowsExtensions }] = await getStartServices();

        const target = await resolveEmitDetectionChangeTarget({
          correlationId,
          http,
          managementClient,
          request,
          sourceRunId,
          spaceId,
        });

        if (target.status !== 'ok') {
          return response.notFound();
        }

        const result = await emitDetectionChangeSignal({
          evidenceConversationKind: 'investigation',
          event: target.event ?? { correlationId },
          gapDescription,
          gateId: 'not_an_incident',
          http,
          logger,
          request,
          sourceRunId,
          spaceId,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowsExtensions,
        });

        const body: EmitDetectionChangeSignalResponse = { emitted: result.emitted };
        return response.ok({ body });
      }
    );
};
