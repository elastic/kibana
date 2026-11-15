/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { resolveSource } from '../../utils/resolve_source_slugs';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { runSourceTool } from '../sources/run_source_tool';
import type { SourceToolDeps } from '../sources/source_tool_deps';
import { NIGHTSHIFT_SOURCE_DELETE_TOOL_ID } from '../tool_ids';

const sourceDeleteSchema = lazySchema(() =>
  z.object({
    source: nightshiftSourceSlugField('The source to delete.'),
  })
);

export const createSourceDeleteTool = ({
  getScopedClients,
  server,
  logger,
}: SourceToolDeps): BuiltinToolDefinition<typeof sourceDeleteSchema> => ({
  id: NIGHTSHIFT_SOURCE_DELETE_TOOL_ID,
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
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: sourceDeleteSchema,
  tags: ['nightshift'],
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { source } }) => ({
      title: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceDelete.confirmation.title',
        {
          defaultMessage: 'Delete Nightshift Source',
        }
      ),
      message: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceDelete.confirmation.message',
        {
          defaultMessage:
            'Delete source "{source}"? Its view, Knowledge Indicators and rules are removed too, and any running onboarding is cancelled. This cannot be undone.',
          values: { source },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceDelete.confirmation.confirm',
        {
          defaultMessage: 'Delete',
        }
      ),
      cancel_text: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceDelete.confirmation.cancel',
        {
          defaultMessage: 'Cancel',
        }
      ),
    }),
  },
  availability: createSignificantEventsAvailability({
    server,
    logger,
    requireManagePrivilege: true,
  }),
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
