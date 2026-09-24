/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import dedent from 'dedent';
import type { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { classifyError } from '../../utils/error_utils';
import {
  loadSourceCatalog,
  resolveSourcesBySlug,
  toSourceRef,
} from '../../utils/resolve_source_slugs';
import { getKiIdentificationStatusToolHandler } from './handler';
import type { GetScopedClients } from '../../../routes/types';

export const SIGNIFICANT_EVENTS_KI_IDENTIFICATION_STATUS_TOOL_ID =
  'platform.sig_events.ki_identification_status';

const onboardingStatusSchema = z.object({
  slug: nightshiftSourceSlugField('Disabled sources are accepted.'),
});

export const createKiIdentificationStatusTool = ({
  streamsKIsOnboardingClient,
  getScopedClients,
}: {
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  getScopedClients: GetScopedClients;
}): BuiltinSkillBoundedTool<typeof onboardingStatusSchema> => ({
  id: SIGNIFICANT_EVENTS_KI_IDENTIFICATION_STATUS_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Get current status for a source KI identification background task.

    Use this tool after starting KI identification to check whether the background task is still
    running, completed, failed, or canceled.

    Use this tool to:
    - Poll KI identification background task progress programmatically
    - Retrieve completed KI identification results
    - Inspect failure details when the background task fails

    Returns:
    - On success: task status payload for the source (includes terminal results when available)
    - On failure: an error result with \`message\`, \`slug\`, \`operation\`, and \`likely_cause\`
  `,
  schema: onboardingStatusSchema,
  handler: async ({ slug }, { request }) => {
    try {
      const scopedClients = await getScopedClients({ request });
      const catalog = await loadSourceCatalog(scopedClients.sourcesClient);
      const [source] = resolveSourcesBySlug(catalog, [slug]);
      const data = await getKiIdentificationStatusToolHandler({
        streamName: source.id,
        streamsKIsOnboardingClient,
      });
      const { stream_name: _streamName, ...status } = data;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { ...toSourceRef(source), ...status },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get KI identification background task status for "${slug}": ${message}`,
              slug,
              operation: 'ki_identification_status',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
