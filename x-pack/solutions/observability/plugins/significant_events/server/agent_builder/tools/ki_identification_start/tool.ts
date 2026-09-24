/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import dedent from 'dedent';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { SIGNIFICANT_EVENTS_APP_ROUTE } from '../../../../common/constants';
import { classifyError } from '../../utils/error_utils';
import {
  assertSourceEnabled,
  loadSourceCatalog,
  resolveSourcesBySlug,
  toSourceRef,
} from '../../utils/resolve_source_slugs';
import { startKiIdentificationToolHandler } from './handler';
import type { GetScopedClients } from '../../../routes/types';

export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_IDENTIFICATION_START_TOOL_ID =
  'platform.sig_events.ki_identification_start';

const onboardingStartSchema = z.object({
  slug: nightshiftSourceSlugField('The source must be enabled.'),
  steps: z
    .array(z.enum(KIsOnboardingStep))
    .optional()
    .default([KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration])
    .describe('Optional ordered KI identification steps for the background task.'),
  connectors: z
    .object({
      features: z.string().max(MAX_ID_LENGTH).optional(),
      queries: z.string().max(MAX_ID_LENGTH).optional(),
    })
    .optional(),
});

export const createKiIdentificationStartTool = ({
  telemetry,
  streamsKIsOnboardingClient,
  maintenanceService,
  getScopedClients,
}: {
  telemetry: EbtTelemetryClient;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  maintenanceService: SignificantEventsMaintenanceService;
  getScopedClients: GetScopedClients;
}): BuiltinSkillBoundedTool<typeof onboardingStartSchema> => ({
  id: SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_IDENTIFICATION_START_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Start Knowledge Indicator (KI) identification for a Nightshift source as a background task.

    This tool schedules the KI identification background task and returns immediately with a
    Kibana path to the Significant Events knowledge indicators view where progress can be tracked.

    Use this tool to:
    - Kick off KI identification for an enabled source
    - Run feature identification and query generation steps in a background task
    - Get a direct Kibana path to track background task progress in the Significant Events UI

    Returns:
    - On success: \`{ slug, title, view_name, kibanaPath: "${SIGNIFICANT_EVENTS_APP_ROUTE}/knowledge_indicators?source=<source id>" }\`
    - On failure: an error result with \`message\`, \`slug\`, \`operation\`, and \`likely_cause\`
  `,
  schema: onboardingStartSchema,
  handler: async ({ slug, steps, connectors }, { request }) => {
    let sourceId = '';
    try {
      const scopedClients = await getScopedClients({ request });
      const catalog = await loadSourceCatalog(scopedClients.sourcesClient);
      const [source] = resolveSourcesBySlug(catalog, [slug]);
      assertSourceEnabled(source);
      sourceId = source.id;

      const resolvedSteps = steps ?? [
        KIsOnboardingStep.FeaturesIdentification,
        KIsOnboardingStep.QueriesGeneration,
      ];

      const data = await startKiIdentificationToolHandler({
        streamName: source.id,
        steps: resolvedSteps,
        connectors,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      });

      telemetry.trackAgentToolKiIdentificationStarted({
        success: true,
        source_id: source.id,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { ...toSourceRef(source), ...data },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      telemetry.trackAgentToolKiIdentificationStarted({
        success: false,
        source_id: sourceId,
        error_message: message,
      });

      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to start KI identification background task for "${slug}": ${message}`,
              slug,
              operation: 'ki_identification_start',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
