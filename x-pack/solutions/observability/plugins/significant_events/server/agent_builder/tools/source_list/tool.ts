/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { MAX_SOURCE_TITLE_LENGTH, MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { runSourceTool } from '../sources/run_source_tool';
import type { SourceToolDeps } from '../sources/source_tool_deps';
import { toSourceSummary } from '../sources/source_summary';
import { NIGHTSHIFT_SOURCE_LIST_TOOL_ID } from '../tool_ids';

const DEFAULT_SOURCES_PER_PAGE = 25;

const sourceListSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(MAX_SOURCE_TITLE_LENGTH)
      .optional()
      .describe('Optional. Return only sources whose title starts with this text.'),
    enabled: z
      .boolean()
      .optional()
      .describe(
        'Optional. `true` returns only enabled sources, `false` only disabled ones. Omit to return both.'
      ),
    page: z.number().int().min(1).optional().default(1).describe('Current page. Defaults to 1.'),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(MAX_SOURCES_PER_PAGE)
      .optional()
      .default(DEFAULT_SOURCES_PER_PAGE)
      .describe(
        `Number of sources to return per page. Defaults to ${DEFAULT_SOURCES_PER_PAGE}, maximum ${MAX_SOURCES_PER_PAGE}. Compare \`total\` with the number of sources returned and request the next \`page\` when there are more.`
      ),
  })
);

export const createSourceListTool = ({
  getScopedClients,
  server,
  logger,
}: SourceToolDeps): BuiltinToolDefinition<typeof sourceListSchema> => ({
  id: NIGHTSHIFT_SOURCE_LIST_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    List the Nightshift sources defined in the current space. This is the full source catalog:
    it includes disabled sources and sources that have no Knowledge Indicators (KIs).

    Each source reports its \`id\`, \`slug\`, \`title\`, \`description\`, \`tags\`, \`esql\` (the
    FROM query), \`type\`, \`view_name\` and \`enabled\` state. \`total\` is the number of sources
    that match the filters in the whole space, not just on this page.

    Use this tool to:
    - Answer questions about which sources exist and how many there are
    - Find the slug of a source from its title
    - Check whether a source is enabled
    Do not use Knowledge Indicator search for this: the sources it reports are only those that own
    the returned KIs.
  `,
  annotations: {
    title: 'List Nightshift Sources',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: sourceListSchema,
  tags: ['nightshift'],
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async ({ search, enabled, page, per_page: perPage }, { request }) =>
    runSourceTool({
      action: 'list sources',
      privilege: 'read',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const { sources, total } = await sourcesClient.list({ page, perPage, search, enabled });
        return { total, page, per_page: perPage, sources: sources.map(toSourceSummary) };
      },
    }),
});
