/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { resolveSource } from '../../utils/resolve_source_slugs';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { runSourceTool } from '../sources/run_source_tool';
import type { SourceToolDeps } from '../sources/source_tool_deps';
import { toSourceSummary } from '../sources/source_summary';
import { NIGHTSHIFT_SOURCE_GET_TOOL_ID } from '../tool_ids';

const sourceGetSchema = lazySchema(() =>
  z.object({
    source: nightshiftSourceSlugField('Disabled sources are included.'),
  })
);

export const createSourceGetTool = ({
  getScopedClients,
  server,
  logger,
}: SourceToolDeps): BuiltinToolDefinition<typeof sourceGetSchema> => ({
  id: NIGHTSHIFT_SOURCE_GET_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Get one Nightshift source of the current space, with the health of its ES|QL view. Disabled
    sources are included.

    \`health\` is one of:
    - \`ok\`: the view exists, matches the stored query and resolves, or its indices do not exist yet
    - \`view_missing\`: the view does not exist
    - \`view_drift\`: the view query differs from the stored query
    - \`unresolvable\`: Elasticsearch cannot plan the query
    - \`unknown\`: the check could not be done, for example because of missing privileges

    An unknown source returns an explicit not-found error.
  `,
  annotations: {
    title: 'Get Nightshift Source',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: sourceGetSchema,
  tags: ['nightshift'],
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async ({ source: slugOrId }, { request }) =>
    runSourceTool({
      action: 'get source',
      privilege: 'read',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const { id } = await resolveSource(sourcesClient, slugOrId);
        const { source, health } = await sourcesClient.get(id);
        return { ...toSourceSummary(source), health };
      },
    }),
});
