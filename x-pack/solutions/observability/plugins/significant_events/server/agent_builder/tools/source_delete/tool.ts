/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';
import { resolveSource } from '../../utils/resolve_source_slugs';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { runSourceTool } from '../sources/run_source_tool';
import { SIGNIFICANT_EVENTS_SOURCE_DELETE_TOOL_ID } from '../tool_ids';

const sourceDeleteSchema = lazySchema(() =>
  z.object({
    source: nightshiftSourceSlugField('The source to delete.'),
  })
);

export const createSourceDeleteTool = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
}): BuiltinToolDefinition<typeof sourceDeleteSchema> => ({
  id: SIGNIFICANT_EVENTS_SOURCE_DELETE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Delete a Nightshift source of the current space. This cannot be undone. It deletes the source's
    ES|QL view and, as when a source is deleted in the UI, cleans up what belongs to it: its
    Knowledge Indicators and rules, and cancels any running onboarding.

    Disabling the source with the update tool keeps all of that. Prefer it when the user only wants
    the source to stop running.
  `,
  annotations: {
    title: 'Delete Nightshift Source',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: sourceDeleteSchema,
  tags: ['nightshift'],
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { source } }) => ({
      title: 'Delete Nightshift Source',
      message: `Delete source "${source}"? Its view, Knowledge Indicators and rules are removed too, and any running onboarding is cancelled. This cannot be undone.`,
      confirm_text: 'Delete',
      cancel_text: 'Cancel',
    }),
  },
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async ({ source: slugOrId }, { request }) =>
    runSourceTool({
      action: 'delete source',
      privilege: 'manage',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const { id, slug, title } = await resolveSource(sourcesClient, slugOrId);
        await sourcesClient.delete(id);
        return { deleted: true, id, slug, title };
      },
    }),
});
