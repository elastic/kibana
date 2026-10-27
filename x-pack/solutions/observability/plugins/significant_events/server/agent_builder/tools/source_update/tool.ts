/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ToolType } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { nightshiftSourceSlugField, updateSourceRequestSchema } from '@kbn/nightshift-shared';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { resolveSource } from '../../utils/resolve_source_slugs';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  getOnboardingPausedFlag,
  ONBOARDING_PAUSED_DESCRIPTION,
  ONBOARDING_PROGRESS_DESCRIPTION,
} from '../sources/onboarding_paused';
import { runSourceTool } from '../sources/run_source_tool';
import { SOURCE_ESQL_RULES } from '../sources/source_esql_rules';
import type { MaintenanceStateReader, SourceToolDeps } from '../sources/source_tool_deps';
import { toSourceSummary } from '../sources/source_summary';
import { formatSourceToolError } from '../sources/source_tool_error';
import { NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID } from '../tool_ids';

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
      .describe(
        '`false` disables the source: its onboarding is cancelled and its rules are turned off, but its Knowledge Indicators and rules are kept. `true` enables it again and turns its rules back on. Omit to leave it as it is.'
      ),
  });
});

const withoutUndefined = <TValue>(
  fields: Record<string, TValue | undefined>
): Record<string, TValue> =>
  Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, TValue] => entry[1] !== undefined)
  );

export const createSourceUpdateTool = ({
  getScopedClients,
  server,
  logger,
  maintenanceService,
}: SourceToolDeps & {
  maintenanceService: MaintenanceStateReader;
}): BuiltinToolDefinition<typeof sourceUpdateSchema> => ({
  id: NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Change a Nightshift source of the current space. Pass only the fields to change: omitted fields
    keep their current value. At least one field to change is required.

    A new query is validated and run as the current user, so the user needs read access to the
    indices it targets. An invalid query returns an error that says why, and nothing is changed.
    Changing the query deletes the source's Knowledge Indicators and rules and stops any running
    onboarding, because they describe the old query. An enabled source is then onboarded again with
    the new query. ${ONBOARDING_PROGRESS_DESCRIPTION}

    Returns the updated source. ${ONBOARDING_PAUSED_DESCRIPTION} When other fields are changed together
    with \`enabled\` and only setting \`enabled\` fails, the other changes are kept and
    \`enabled_change_failed\` says why. Tell the user which part did not apply.
  `,
  annotations: {
    title: 'Update Nightshift Source',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: sourceUpdateSchema,
  tags: ['nightshift'],
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { source, ...changes } }) => {
      const changeList = Object.entries(withoutUndefined(changes))
        .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
        .join(', ');
      // A new query makes the stored knowledge stale, so its prompt says that it is reset.
      const resetsKnowledge = changes.esql !== undefined;
      return {
        title: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.title',
          {
            defaultMessage: 'Update Nightshift Source',
          }
        ),
        message: resetsKnowledge
          ? i18n.translate(
              'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.queryChangeMessage',
              {
                defaultMessage:
                  'Update source "{source}" ({changeList})? Its knowledge indicators and rules describe the old query, so they are deleted and any running onboarding is stopped. An enabled source is then onboarded again with the new query.',
                values: { source, changeList },
              }
            )
          : i18n.translate(
              'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.message',
              {
                defaultMessage: 'Update source "{source}" ({changeList})?',
                values: { source, changeList },
              }
            ),
        confirm_text: resetsKnowledge
          ? i18n.translate(
              'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.queryChangeConfirm',
              {
                defaultMessage: 'Save and reset knowledge',
              }
            )
          : i18n.translate(
              'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.confirm',
              {
                defaultMessage: 'Update',
              }
            ),
        cancel_text: i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.sourceUpdate.confirmation.cancel',
          {
            defaultMessage: 'Cancel',
          }
        ),
      };
    },
  },
  availability: createSignificantEventsAvailability({
    server,
    logger,
    requireManagePrivilege: true,
  }),
  handler: async ({ source: slugOrId, enabled, ...changes }, { request }) =>
    runSourceTool({
      action: 'update source',
      privilege: 'manage',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const changedFields = withoutUndefined(changes);
        const hasContentChanges = Object.keys(changedFields).length > 0;
        if (!hasContentChanges && enabled === undefined) {
          throw Boom.badRequest('Nothing to update: pass at least one field to change');
        }

        const onboardingPaused = await getOnboardingPausedFlag({ maintenanceService, request });
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
        let enabledChangeFailed: { requested: boolean; message: string } | undefined;
        if (enabled !== undefined) {
          try {
            updated = await sourcesClient.setEnabled(current.id, enabled);
          } catch (error) {
            if (!hasContentChanges) {
              throw error;
            }
            // The other changes are saved already, so report them rather than a plain failure.
            const reason = formatSourceToolError(error);
            logger.error(
              `Failed to update source ${current.id}: setting enabled failed: ${reason}`
            );
            enabledChangeFailed = {
              requested: enabled,
              message: `The other changes were saved, but setting enabled to ${enabled} failed: ${reason}. The enabled state of the source is unknown and the \`enabled\` value in this result may be out of date. Call source_get to check it.`,
            };
          }
        }

        return {
          ...toSourceSummary(updated),
          ...(enabledChangeFailed && { enabled_change_failed: enabledChangeFailed }),
          ...onboardingPaused,
        };
      },
    }),
});
