/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { z } from '@kbn/zod/v4';
import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  BuiltinToolDefinition,
  StaticToolRegistration,
  ToolAvailabilityResult,
} from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH, upsertStreamQueryRequestSchema } from '@kbn/significant-events-schema';
import dedent from 'dedent';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { createQueryKnowledgeIndicatorToolHandler } from './handler';
import {
  loadSourceCatalog,
  resolveSourcesBySlug,
  toSourceRef,
} from '../../utils/resolve_source_slugs';

export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID =
  platformSignificantEventsTools.createQueryKnowledgeIndicator;

const queryInputSchema = upsertStreamQueryRequestSchema.extend({
  id: z.string().max(MAX_ID_LENGTH).optional(),
  expires_at: z.iso
    .datetime()
    .optional()
    .describe(
      'Optional expiry deadline (ISO 8601). Provide to create a managed KI that expires at this date. ' +
        'Omit to create a durable KI with no expiry.'
    ),
});

const createQueryKnowledgeIndicatorSchema = z
  .object({
    slug: nightshiftSourceSlugField('The query KI is saved on this source.'),
  })
  .extend(queryInputSchema.shape);

export function createQueryKnowledgeIndicatorTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof createQueryKnowledgeIndicatorSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createQueryKnowledgeIndicatorSchema> = {
    id: SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Create a query Knowledge Indicator (KI) for a Nightshift source and persist it to
      significant events query storage.

      Use this tool when the conversation discovers a new detection query that should be saved for
      future investigations. Pass the source slug, not its id.
    `,
    annotations: {
      title: 'Create Query Knowledge Indicator',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: createQueryKnowledgeIndicatorSchema,
    tags: ['streams', 'significant-events'],
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams }) => {
        const slug = String(toolParams.slug ?? 'unknown source');
        const title = String(toolParams.title ?? 'Untitled query');
        const esql =
          typeof toolParams.esql === 'object' && toolParams.esql && 'query' in toolParams.esql
            ? String((toolParams.esql as { query?: unknown }).query ?? '')
            : '';

        return {
          title: 'Save Query KI',
          message: `Save Query KI for source "${slug}" (title: "${title}", esql: "${esql}")?`,
          confirm_text: 'Save',
          cancel_text: 'Cancel',
        };
      },
    },
    availability: {
      cacheMode: 'space',
      handler: async (): Promise<ToolAvailabilityResult> => {
        try {
          await assertSignificantEventsAccess({
            server,
            licensing: server.licensing,
          });
          return { status: 'available' };
        } catch (error) {
          if (error instanceof Error) {
            logger.debug(error.stack ?? error.message);
          } else {
            logger.debug(String(error));
          }
          return {
            status: 'unavailable',
            reason:
              error instanceof Error
                ? error.message
                : 'Significant events access is not available in the current context',
          };
        }
      },
    },
    handler: async ({ slug, ...queryInput }, context) => {
      const { request } = context;
      let sourceId = '';

      try {
        const scopedClients = await getScopedClients({
          request,
        });

        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });

        const catalog = await loadSourceCatalog(scopedClients.sourcesClient);
        const [source] = resolveSourcesBySlug(catalog, [slug]);
        sourceId = source.id;

        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const { id } = await createQueryKnowledgeIndicatorToolHandler({
          kiClient,
          source,
          queryInput,
          logger,
        });

        telemetry.trackAgentBuilderKnowledgeIndicatorCreated({
          ki_kind: 'query',
          tool_id: 'ki_query_create',
          success: true,
          source_id: source.id,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                ...toSourceRef(source),
                query: {
                  id,
                },
                acknowledged: true,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running ki_query_create: ${message}`);
        if (error instanceof Error) {
          logger.debug(error.stack ?? error.message);
        } else {
          logger.debug(String(error));
        }

        telemetry.trackAgentBuilderKnowledgeIndicatorCreated({
          ki_kind: 'query',
          tool_id: 'ki_query_create',
          success: false,
          source_id: sourceId,
          error_message: message,
        });

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create query knowledge indicator: ${message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
