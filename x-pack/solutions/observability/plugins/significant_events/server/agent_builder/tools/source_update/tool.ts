/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { nightshiftSourceSlugField, updateSourceRequestSchema } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';
import { resolveSource } from '../../utils/resolve_source_slugs';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  getOnboardingPausedFlag,
  ONBOARDING_PAUSED_DESCRIPTION,
} from '../sources/onboarding_paused';
import { runSourceTool } from '../sources/run_source_tool';
import { SOURCE_ESQL_RULES } from '../sources/source_esql_rules';
import { toSourceSummary } from '../sources/source_summary';
import { SIGNIFICANT_EVENTS_SOURCE_UPDATE_TOOL_ID } from '../tool_ids';

const sourceUpdateSchema = lazySchema(() => {
  const { shape } = updateSourceRequestSchema;
  return updateSourceRequestSchema.partial().extend({
    source: nightshiftSourceSlugField('The source to update.'),
    title: shape.title
      .optional()
      .describe('New title. The slug and the view name do not change with it.'),
    description: shape.description.describe('New description. Pass an empty string to clear it.'),
    tags: shape.tags
      .optional()
      .describe('New tags, replacing all current tags. Pass `[]` to clear them.'),
    esql: shape.esql.optional().describe(`New ES|QL query. ${SOURCE_ESQL_RULES}`),
    enabled: z
      .boolean()
      .optional()
      .describe('`false` disables the source, `true` enables it. Omit to leave it as it is.'),
  });
});

export const createSourceUpdateTool = ({
  getScopedClients,
  server,
  logger,
  maintenanceService,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
}): BuiltinToolDefinition<typeof sourceUpdateSchema> => ({
  id: SIGNIFICANT_EVENTS_SOURCE_UPDATE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Change a Nightshift source of the current space. Pass only the fields to change: omitted fields
    keep their current value. At least one field to change is required.

    A new query is validated and run as the current user, so the user needs read access to the
    indices it targets. An invalid query returns an error that says why, and nothing is changed.

    Returns the updated source. ${ONBOARDING_PAUSED_DESCRIPTION}
  `,
  annotations: {
    title: 'Update Nightshift Source',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: sourceUpdateSchema,
  tags: ['nightshift'],
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { source, ...changes } }) => {
      const changeList = Object.entries(changes)
        .filter(([, value]) => value !== undefined)
        .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
        .join(', ');
      return {
        title: 'Update Nightshift Source',
        message: `Update source "${source}" (${changeList})?`,
        confirm_text: 'Update',
        cancel_text: 'Cancel',
      };
    },
  },
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async ({ source: slugOrId, enabled, ...changes }, { request }) =>
    runSourceTool({
      action: 'update source',
      privilege: 'manage',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const changedFields = Object.fromEntries(
          Object.entries(changes).filter(([, value]) => value !== undefined)
        );
        const hasContentChanges = Object.keys(changedFields).length > 0;
        if (!hasContentChanges && enabled === undefined) {
          throw Boom.badRequest('Nothing to update: pass at least one field to change');
        }

        const current = await resolveSource(sourcesClient, slugOrId);
        let updated = current;
        if (hasContentChanges) {
          // Parsing keeps exactly the fields an update request carries, so the stored values of a
          // field added later are kept too.
          updated = await sourcesClient.update(
            current.id,
            updateSourceRequestSchema.parse({ ...current, ...changedFields })
          );
        }
        if (enabled !== undefined) {
          updated = await sourcesClient.setEnabled(current.id, enabled);
        }

        return {
          ...toSourceSummary(updated),
          ...(await getOnboardingPausedFlag({ maintenanceService, request })),
        };
      },
    }),
});
