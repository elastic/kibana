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
import { cancelKiIdentificationToolHandler } from './handler';
import type { GetScopedClients } from '../../../routes/types';

export const SIGNIFICANT_EVENTS_KI_IDENTIFICATION_CANCEL_TOOL_ID =
  'platform.sig_events.ki_identification_cancel';

const cancelSchema = z.object({
  slug: nightshiftSourceSlugField('Disabled sources are accepted.'),
});

export const createKiIdentificationCancelTool = ({
  streamsKIsOnboardingClient,
  getScopedClients,
}: {
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  getScopedClients: GetScopedClients;
}): BuiltinSkillBoundedTool<typeof cancelSchema> => ({
  id: SIGNIFICANT_EVENTS_KI_IDENTIFICATION_CANCEL_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Cancel an in-progress KI identification background task for a Nightshift source.

    Use this tool to:
    - Stop a running KI identification background task when the user requests cancellation

    Returns:
    - On success: cancel acknowledgement with slug, title, view_name, execution_id, and status
    - On failure: an error result with \`message\`, \`slug\`, \`operation\`, and \`likely_cause\`
  `,
  schema: cancelSchema,
  handler: async ({ slug }, { request }) => {
    try {
      const scopedClients = await getScopedClients({ request });
      const catalog = await loadSourceCatalog(scopedClients.sourcesClient);
      const [source] = resolveSourcesBySlug(catalog, [slug]);
      const data = await cancelKiIdentificationToolHandler({
        streamName: source.id,
        streamsKIsOnboardingClient,
        request,
      });
      const { stream_name: _streamName, ...cancelled } = data;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { ...toSourceRef(source), ...cancelled },
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
              message: `Failed to cancel KI identification background task for "${slug}": ${message}`,
              slug,
              operation: 'ki_identification_cancel',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
