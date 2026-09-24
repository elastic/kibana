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
import { significantEventSchema } from '@kbn/significant-events-schema';
import dedent from 'dedent';
import type { SignificantEventsServer } from '../../../types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { createEventToolHandler } from './handler';
import { loadSourceCatalog, toSourceRef } from '../../utils/resolve_source_slugs';
import { assignStoredSourceIds, sourceSlugsSchema } from '../../utils/stored_source_fields';

export const SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID = platformSignificantEventsTools.createEvent;

const createEventSchema = significantEventSchema
  .pick({
    status: true,
    title: true,
    symptom_hypothesis: true,
    summary: true,
    severity: true,
    confidence: true,
  })
  .extend({ slugs: sourceSlugsSchema });

export function createEventTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof createEventSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createEventSchema> = {
    id: SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventCreate.description', {
        defaultMessage: 'Create a significant event for one or more sources.',
      })}
    `,
    annotations: {
      title: 'Create Significant Event',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: createEventSchema,
    tags: ['streams', 'significant-events'],
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams }) => ({
        title: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventCreate.confirmation.title',
          {
            defaultMessage: 'Create Significant Event',
          }
        ),
        message: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventCreate.confirmation.message',
          {
            defaultMessage: 'Create significant event "{title}" for sources: {sources}?',
            values: {
              title: toolParams.title,
              sources: toolParams.slugs.join(', '),
            },
          }
        ),
        confirm_text: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventCreate.confirmation.confirm',
          {
            defaultMessage: 'Create',
          }
        ),
        cancel_text: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventCreate.confirmation.cancel',
          {
            defaultMessage: 'Cancel',
          }
        ),
      }),
    },
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing, sourcesClient } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });
        const catalog = await loadSourceCatalog(sourcesClient);
        const eventInput = assignStoredSourceIds(catalog, toolParams);
        const sources = eventInput.stream_names;

        const data = await createEventToolHandler({
          eventClient: await getEventClient(),
          eventInput,
        });

        telemetry.trackAgentToolEventCreate({
          success: true,
          stream_names: sources,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                ...data,
                sources: eventInput.stream_names.flatMap((sourceId) => {
                  const source = catalog.byId.get(sourceId);
                  return source ? [toSourceRef(source)] : [];
                }),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_create: ${message}`);
        telemetry.trackAgentToolEventCreate({
          success: false,
          stream_names: toolParams.slugs,
          error_message: message,
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventCreate.errorMessage',
                  {
                    defaultMessage: 'Failed to create significant event: {message}',
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
