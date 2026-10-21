/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { createSourceRequestSchema } from '@kbn/nightshift-shared';
import { lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  getOnboardingPausedFlag,
  ONBOARDING_PAUSED_DESCRIPTION,
} from '../sources/onboarding_paused';
import { runSourceTool } from '../sources/run_source_tool';
import { SOURCE_ESQL_RULES } from '../sources/source_esql_rules';
import { toSourceSummary } from '../sources/source_summary';
import { SIGNIFICANT_EVENTS_SOURCE_CREATE_TOOL_ID } from '../tool_ids';

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
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
}): BuiltinToolDefinition<typeof sourceCreateSchema> => ({
  id: SIGNIFICANT_EVENTS_SOURCE_CREATE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Create a Nightshift source in the current space. The query is validated and run as the current
    user, so the user needs read access to the indices it targets. An invalid query returns an
    error that says why.

    The source is created enabled. Returns the created source, including its \`slug\`.
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
      title: 'Create Nightshift Source',
      message: `Create source "${title}" with query: ${esql}?`,
      confirm_text: 'Create',
      cancel_text: 'Cancel',
    }),
  },
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async (toolParams, { request }) =>
    runSourceTool({
      action: 'create source',
      privilege: 'manage',
      request,
      getScopedClients,
      server,
      logger,
      run: async ({ sourcesClient }) => ({
        ...toSourceSummary(await sourcesClient.create(toolParams)),
        ...(await getOnboardingPausedFlag({ maintenanceService, request })),
      }),
    }),
});
