/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { lazySchema } from '@kbn/zod/v4';
import {
  significantEventManualStatusSchema,
  significantEventCloseReasonSchema,
  significantEventSchema,
} from '@kbn/significant-events-schema';
import dedent from 'dedent';
import type { SignificantEventsServer } from '../../../types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { getWorkflowExecutionIdFromRequest } from '../../../lib/telemetry/ebt/workflow_execution_id';
import type { GetScopedClients } from '../../../routes/types';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { existingAlertIdentity } from '../alert_identity_telemetry';
import { trackTelemetryBestEffort } from '../../../lib/telemetry/track_telemetry_best_effort';
import { reportToolFailure, toTelemetryErrorMessage } from '../tool_failure';
import { updateEventStatusToolHandler } from './handler';

export const SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID =
  platformSignificantEventsTools.updateEventStatus;

const UNMATCHED_EVENT_ID = 'unknown';

export const eventStatusUpdateSchema = lazySchema(() =>
  significantEventSchema
    .pick({
      event_id: true,
      assessment_note: true,
    })
    .extend({
      status: significantEventManualStatusSchema,
      close_reason: significantEventCloseReasonSchema.optional(),
      event_id: significantEventSchema.shape.event_id.describe(
        'The event_id of the existing significant event to update.'
      ),
      assessment_note: significantEventSchema.shape.assessment_note.describe(
        'Optional short reason for the change, for example why the event recovered or was a false alarm.'
      ),
    })
);

export function createEventStatusUpdateTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventStatusUpdateSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof eventStatusUpdateSchema> = {
    id: SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventStatusUpdate.description', {
        defaultMessage:
          'Set an existing significant event to `active` or `inactive`. assessment_note is optional. Returns `updated: 0, ignored: 1` when no change was written, either because no event matches the id or because it already has that status.',
      })}
    `,
    annotations: {
      title: 'Update Significant Event Status',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: eventStatusUpdateSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      const workflowExecutionId = getWorkflowExecutionIdFromRequest(request);
      try {
        const { getEventSearchClient, licensing } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });
        await assertCanManageSignificantEvents({ request, server });

        const data = await updateEventStatusToolHandler({
          eventSearchClient: await getEventSearchClient(),
          eventId: toolParams.event_id,
          status: toolParams.status,
          closeReason: toolParams.close_reason,
          assessmentNote: toolParams.assessment_note,
          workflowExecutionId,
        });

        const reason = data.updated === 0 ? data.reason : undefined;
        const isUnmatched = reason === 'not_found';
        // An id that matches no event is whatever the model sent, so it stays out of telemetry.
        const telemetryEventId = isUnmatched ? UNMATCHED_EVENT_ID : toolParams.event_id;
        trackTelemetryBestEffort({
          logger,
          description: 'event_status_update telemetry',
          track: () =>
            telemetry.trackAgentToolEventStatusUpdate(
              {
                workflow_execution_id: workflowExecutionId,
                ...existingAlertIdentity({
                  eventId: telemetryEventId,
                  spaceId: request.spaceId,
                }),
                success:
                  data.updated === 1 || reason === 'already_in_state' || reason === 'not_a_breach',
                event_id: telemetryEventId,
                status: toolParams.status,
                ...(isUnmatched ? { error_message: 'not_found' } : {}),
              },
              request
            ),
        });

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const failure = reportToolFailure({
          error,
          toolId: SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
          errorLogMessage: `Error running event_status_update: ${message}`,
          logger,
          telemetry,
          request,
          runContext: context.runContext,
        });
        trackTelemetryBestEffort({
          logger,
          description: 'failed event_status_update telemetry',
          track: () =>
            telemetry.trackAgentToolEventStatusUpdate(
              {
                workflow_execution_id: workflowExecutionId,
                ...existingAlertIdentity({
                  eventId: toolParams.event_id,
                  spaceId: request.spaceId,
                }),
                success: false,
                event_id: toolParams.event_id,
                status: toolParams.status,
                error_message: toTelemetryErrorMessage(failure, message),
              },
              request
            ),
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventStatusUpdate.errorMessage',
                  {
                    defaultMessage: 'Failed to update significant event status: {message}',
                    values: { message },
                  }
                ),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
