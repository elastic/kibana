/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createSourceRequestSchema } from '@kbn/nightshift-shared';
import { lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
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
import { NIGHTSHIFT_SOURCE_CREATE_TOOL_ID } from '../tool_ids';

const sourceCreateSchema = lazySchema(() => {
  const { shape } = createSourceRequestSchema;
  return createSourceRequestSchema.extend({
    title: shape.title.describe(
      'Human-readable name of the source. The slug is generated from it and cannot be changed later.'
    ),
    description: shape.description.describe('Optional. What the source contains.'),
    tags: shape.tags.describe('Optional. Free-form labels. Defaults to none.'),
    esql: shape.esql.describe(`ES|QL query that defines the source. ${SOURCE_ESQL_RULES}`),
  });
});

export const createSourceCreateTool = ({
  getScopedClients,
  server,
  logger,
  maintenanceService,
}: SourceToolDeps & {
  maintenanceService: MaintenanceStateReader;
}): BuiltinToolDefinition<typeof sourceCreateSchema> => ({
  id: NIGHTSHIFT_SOURCE_CREATE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Create a Nightshift source in the current space. The query is validated and run as the current
    user, so the user needs read access to the indices it targets. An invalid query returns an
    error that says why.

    The source is created enabled, and its onboarding starts on its own.
    ${ONBOARDING_PROGRESS_DESCRIPTION} Returns the created source, including its \`slug\`.
    ${ONBOARDING_PAUSED_DESCRIPTION}
  `,
  annotations: {
    title: 'Create Nightshift Source',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: sourceCreateSchema,
  tags: ['nightshift'],
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { title, esql } }) => ({
      title: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceCreate.confirmation.title',
        {
          defaultMessage: 'Create Nightshift Source',
        }
      ),
      message: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceCreate.confirmation.message',
        {
          defaultMessage: 'Create source "{title}" with query: {esql}?',
          values: { title, esql },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceCreate.confirmation.confirm',
        {
          defaultMessage: 'Create',
        }
      ),
      cancel_text: i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.sourceCreate.confirmation.cancel',
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
  handler: async (toolParams, { request }) =>
    runSourceTool({
      action: 'create source',
      privilege: 'manage',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => {
        const onboardingPaused = await getOnboardingPausedFlag({ maintenanceService, request });
        return {
          ...toSourceSummary(await sourcesClient.create(toolParams)),
          ...onboardingPaused,
        };
      },
    }),
});
