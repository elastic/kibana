/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ApiPrivileges } from '@kbn/core-security-server';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_LIBRARY_URL } from '../../../common/constants';
import type { HuntPreserveResponse } from '../../../common/hunt_library';
import { HUNT_SESSION_HANDLE_MAX_LENGTH } from '../../../common/hunt_library_profile_state';
import { readHuntUserKey, resolveHuntSession } from '../../hunt_library/session_lookup';
import {
  HUNT_SESSION_MAX_FIELDS_PER_ROW,
  HUNT_SESSION_MAX_FILTERS,
  HUNT_SESSION_MAX_NOTE_LENGTH,
  HUNT_SESSION_MAX_ROWS_PER_PRESERVATION,
} from '../../../common/hunt_session_attachment_schema';
import { reportPreservationTelemetry } from '../../hunt_library/hunt_telemetry';
import { HuntEvidenceRejectedError, type EvidenceSelection } from '../../hunt_library/evidence';
import { HuntPreserveError, preserveHuntEvidence } from '../../hunt_library/preserve';
import { getHuntDefinition } from '../../hunt_library/seed';
import { HuntSessionStoreError } from '../../hunt_library/session_attachment_store';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const scalar = schema.nullable(
  schema.oneOf([schema.string({ maxLength: 1024 }), schema.number(), schema.boolean()])
);
const record = schema.recordOf(schema.string({ maxLength: 256 }), scalar, {
  validate: (value) =>
    Object.keys(value).length > HUNT_SESSION_MAX_FIELDS_PER_ROW
      ? `at most ${HUNT_SESSION_MAX_FIELDS_PER_ROW} fields`
      : undefined,
});

const rowSchema = schema.oneOf([
  schema.object({
    kind: schema.literal('raw_event'),
    index: schema.string({ minLength: 1, maxLength: 256 }),
    id: schema.string({ minLength: 1, maxLength: 512 }),
  }),
  schema.object({ kind: schema.literal('aggregate'), values: record }),
]);

/**
 * Preserves rows an analyst selected in Discover as evidence on an Investigation, creating it on
 * the first preservation. Needs AlertZero Read and `manage_investigations`. The space comes from the
 * request and the hunt from the session's own execution, never from the body.
 */
export const registerHuntPreserveRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkflowsManagement,
  getAgentBuilderConversations,
  getAgentBuilderAttachments,
  reportTelemetryEvent,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: `${HUNT_LIBRARY_URL}/session/preserve`,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [
            ALERTZERO_API_PRIVILEGE_READ,
            ApiPrivileges.manage('investigations'),
          ],
        },
      },
      summary: 'Preserve selected Discover rows from a Hunt session as Investigation evidence',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              token: schema.string({ minLength: 1, maxLength: HUNT_SESSION_HANDLE_MAX_LENGTH }),
              preservation_id: schema.string({
                minLength: 36,
                maxLength: 36,
                validate: (value) => (UUID_PATTERN.test(value) ? undefined : 'must be a UUID'),
              }),
              query: schema.string({ maxLength: 20_000 }),
              filters: schema.arrayOf(record, { maxSize: HUNT_SESSION_MAX_FILTERS }),
              time_range: schema.object({
                from: schema.string({ maxLength: 64 }),
                to: schema.string({ maxLength: 64 }),
              }),
              columns: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 30 }),
              data_view_id: schema.string({ maxLength: 256 }),
              note: schema.maybe(schema.string({ maxLength: HUNT_SESSION_MAX_NOTE_LENGTH })),
              rows: schema.arrayOf(rowSchema, {
                minSize: 1,
                maxSize: HUNT_SESSION_MAX_ROWS_PER_PRESERVATION,
              }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }

        const core = await context.core;
        const user = core.security.authc.getCurrentUser();
        let verified;
        try {
          verified = await resolveHuntSession({
            management,
            request,
            spaceId: getSpaceId(request),
            sessionExecutionId: request.body.token,
            userKey: readHuntUserKey(user),
          });
        } catch (err) {
          logger.error(`Failed to resolve Hunt session: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve the Hunt session' },
          });
        }
        if (!verified.ok) {
          return response.badRequest({
            body: {
              message: 'Invalid Hunt session state',
              attributes: { reason: verified.reason },
            },
          });
        }
        const { claims } = verified;
        const definition = getHuntDefinition(claims.definitionId);
        if (!definition || definition.version !== claims.definitionVersion) {
          return response.conflict({
            body: {
              message: 'This hunt changed since the session started',
              attributes: { reason: 'definition_changed' },
            },
          });
        }

        try {
          const { body } = request;
          const result = await preserveHuntEvidence({
            management,
            request,
            conversations: await getAgentBuilderConversations().getScopedClient({ request }),
            attachments: await getAgentBuilderAttachments().getScopedClient({ request }),
            esClient: core.elasticsearch.client.asCurrentUser,
            logger,
            definition,
            claims,
            actor: user?.username ?? 'unknown',
            preservationId: body.preservation_id,
            note: body.note,
            context: {
              query: body.query,
              filters: body.filters,
              timeRange: body.time_range,
              dataViewId: body.data_view_id,
            },
            columns: body.columns,
            selection: body.rows as EvidenceSelection[],
          });
          reportPreservationTelemetry({
            report: reportTelemetryEvent,
            huntId: definition.id,
            result,
          });
          const responseBody: HuntPreserveResponse = {
            investigation_id: result.investigationId,
            evidence_count: result.evidenceCount,
            added_count: result.addedCount,
            created: result.created,
            profile_token: claims.sessionExecutionId,
          };
          return response.ok({ body: responseBody });
        } catch (err) {
          if (err instanceof HuntEvidenceRejectedError) {
            return response.customError({
              statusCode: 422,
              body: { message: err.message, attributes: { reason: err.reason } },
            });
          }
          if (err instanceof HuntSessionStoreError) {
            return response.customError({
              statusCode: err.code === 'write_conflict' ? 409 : 422,
              body: { message: err.message, attributes: { reason: err.code } },
            });
          }
          if (err instanceof HuntPreserveError) {
            const statusCode =
              err.code === 'preservation_in_progress'
                ? 409
                : err.code === 'handoff_failed'
                ? 500
                : 403;
            return response.customError({
              statusCode,
              body: { message: err.message, attributes: { reason: err.code } },
            });
          }
          logger.error(`Failed to preserve Hunt evidence: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to preserve Hunt evidence' },
          });
        }
      })
    );
};
