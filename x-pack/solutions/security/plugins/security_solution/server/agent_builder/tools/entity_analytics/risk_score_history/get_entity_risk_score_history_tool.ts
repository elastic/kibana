/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ToolAvailabilityContext,
  ToolAvailabilityResult,
} from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core/server';
import { ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { ExperimentalFeatures } from '../../../../../common';
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { buildRenderAttachmentTag } from '../attachment_utils';
import { getEntityAnalyticsToolAvailability } from '../entity_analytics_availability';
import { requireResolvedEntity } from '../entity_resolution';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import {
  buildRiskScoreHistoryAttachmentId,
  ensureRiskScoreHistoryAttachment,
} from './risk_score_history_attachment_utils';
import { resolveSimpleRiskScoreHistoryInterval } from './resolve_risk_score_history_interval';
import { resolveResolutionTargetEntityId } from '../resolution_target_ids';
import { parseTimeBound, timeRangeParseError } from '../time_range_utils';

const DEFAULT_FROM = 'now-90d' as const;
const DEFAULT_TO = 'now' as const;
const DEFAULT_SCORE_TYPE = 'base' as const;

const schema = z.object({
  entityType: IdentifierType.describe(
    'The type of entity: host, user, service, or generic'
  ).optional(),
  entityId: z
    .string()
    .min(1)
    .max(1000)
    .describe(
      'The entity id (EUID), canonical entity.name, or user.full_name to retrieve risk score history for. ' +
        'Examples: "host:server1" (prefixed EUID), "server1" (non-prefixed), ' +
        '"LAPTOP-SALES04" (entity.name), "John Doe" (user.full_name). ' +
        'When a security.entity attachment identifies the target, use its prefixed entity id here.'
    ),
  from: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'Start of the time range in Kibana date-math (e.g. "now-30d", "now-1y", "2026-01-01"). ' +
        `Defaults to "${DEFAULT_FROM}". For "last 30 days" pass from="now-30d"; for a calendar date use ISO.`
    )
    .optional(),
  to: z
    .string()
    .min(1)
    .max(100)
    .describe(
      `End of the time range in Kibana date-math (e.g. "now", "2026-03-15"). Defaults to "${DEFAULT_TO}".`
    )
    .optional(),
  scoreType: z
    .enum(['base', 'resolution'])
    .optional()
    .describe(
      'Which score series to chart. Defaults to "base" (the entity\'s own score). ' +
        'Use "resolution" only for resolution-group / linked-identity cluster trends ' +
        '(e.g. when a security.entity attachment has resolutionRiskStats for a multi-member group).'
    ),
  includeContributions: z
    .boolean()
    .optional()
    .describe(
      'When true, each history entry also includes the contributing alert inputs and modifiers ' +
        'for that scoring run. Use only when the user asks why a score changed or what drove a spike; ' +
        'default is false (light timestamps + scores).'
    ),
});

export const SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID = securityTool(
  'get_entity_risk_score_history'
);

const getRiskScoreHistoryToolAvailability = async ({
  core,
  request,
  spaceId,
  logger,
  experimentalFeatures,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<ToolAvailabilityResult> => {
  const entityAnalyticsAvailability = await getEntityAnalyticsToolAvailability({
    core,
    request,
    spaceId,
    experimentalFeatures,
    logger,
    minLicense: 'platinum',
  });
  if (entityAnalyticsAvailability.status !== 'available') {
    return entityAnalyticsAvailability;
  }

  if (!experimentalFeatures.riskScoreHistoryEnabled) {
    return { status: 'unavailable', reason: 'Risk score history is not enabled.' };
  }

  return { status: 'available' };
};

const checkEntityAnalyticsAccess = async ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
}): Promise<{ allowed: true } | { allowed: false; result: ErrorResult }> => {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { hasAllRequested } = await checkPrivileges({
    kibana: ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES.map((privilege) =>
      security.authz.actions.api.get(privilege)
    ),
  });

  if (hasAllRequested) {
    return { allowed: true };
  }

  return {
    allowed: false,
    result: {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: {
        message:
          'You do not have permission to view entity analytics risk score history in this space.',
      },
    },
  };
};

export const getEntityRiskScoreHistoryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  kibanaVersion: string
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
    type: ToolType.builtin,
    description: `Get the historical risk score time series for a single security entity (host, user, service, or generic).

ONLY use when the user explicitly asks about risk score over time — e.g. trend, history, timeline, chart, "has the score changed", "why did it spike". Do NOT use for generic investigate / profile / details / "tell me about this entity" asks — those are security.get_entity only. Prefer this over get_entity's profile_history for risk-score trends (profile_history is entity-store attribute snapshots).

This tool resolves the entity, then stores a \`security.entity_risk_score_history\` attachment (creating new or updating existing) and returns an \`other\` result containing a pre-formatted \`renderTag\` string. To show the chart inline, copy that \`renderTag\` string VERBATIM onto its own line in your reply, followed by a blank line, before your prose. Do NOT assemble the tag yourself from \`attachmentId\` and \`version\`, and do NOT substitute the id with anything derived from the entity name, EUID, or attachment type name.

When the id/name resolves to multiple candidate entities, no attachment is stored, no \`renderTag\` is returned, and you must NOT emit a render tag — instead ask the user to supply the exact entity id (EUID) from the returned candidates.

IMPORTANT — entries are aggregated, not every scoring run: the series is a date_histogram. The result's \`bucketInterval\` field is the histogram bucket size (e.g. "1d" for ~90 days, down to "1h" for short ranges) — not the lookback window (\`from\`/\`to\`). Each entry is the highest calculated_score_norm in that bucket. Multiple scoring runs in the same bucket (e.g. two scores on the same day with bucketInterval "1d") collapse to ONE point. A short \`entries\` array means few buckets had data — not that only that many scoring runs ever existed. Narrow \`from\`/\`to\` (e.g. now-24h) for finer buckets. Full interactive history is in the entity flyout via the attachment. Do not dump every history point as a markdown table — the chart attachment shows the series.

Time range via optional \`from\`/\`to\` date-math (default last 90 days). Defaults to the entity's \`base\` score series; pass \`scoreType: "resolution"\` for resolution-group trends. Pass \`includeContributions: true\` only when explaining *why* a score changed. For fleet-level "who increased the most", use security.search_entities with riskScoreChangeInterval first, then drill in with this tool.`,
    schema,
    tags: ['security', 'entity-analytics', 'risk-score', 'history'],
    annotations: {
      title: 'Get Entity Risk Score History',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          return await getRiskScoreHistoryToolAvailability({
            core,
            request,
            spaceId,
            logger,
            experimentalFeatures,
          });
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check ${SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID} availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (params, { spaceId, esClient, savedObjectsClient, request, attachments }) => {
      logger.debug(
        `${SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const {
        entityType,
        entityId,
        from = DEFAULT_FROM,
        to = DEFAULT_TO,
        scoreType = DEFAULT_SCORE_TYPE,
        includeContributions = false,
      } = params;

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
        spaceId,
        actionType: 'read',
        entityTypes: entityType ? [entityType] : [],
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkEntityAnalyticsAccess({ request, security });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = esClient.asCurrentUser;
        const resolved = await requireResolvedEntity({
          esClient: client,
          spaceId,
          entityId,
          entityType,
        });
        if (!resolved.ok) {
          return { results: resolved.results };
        }

        const { identifierType, identifier, entityStoreId } = resolved.identity;

        // 1 - Get the history data
        const min = parseTimeBound(from);
        const max = parseTimeBound(to, true);
        if (!min || !max) {
          const error = timeRangeParseError(from, to);
          telemetryTracker.recordFailure(error.data.message);
          return { results: [error] };
        }

        // Chat snapshot: simple auto-interval (no uiSettings). Flyout range control
        // re-fetches via the public history route, which still uses TimeBuckets.
        const bucketInterval = resolveSimpleRiskScoreHistoryInterval({ min, max });

        let historyEntityId = entityStoreId;
        // Resolution-group history is keyed by the resolution *target*'s entity.id.
        // Resolve that target before querying
        if (scoreType === 'resolution') {
          const targetId = await resolveResolutionTargetEntityId({
            entityStoreId,
            spaceId,
            esClient: client,
            createResolutionClient: entityStore?.createResolutionClient,
            logger,
          });
          if (targetId === null) {
            const errorMessage = `Could not resolve resolution group target for "${entityId}"`;
            telemetryTracker.recordFailure(errorMessage);
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.error,
                  data: {
                    message: errorMessage,
                  },
                },
              ],
            };
          }
          historyEntityId = targetId;
        }

        const riskScoreDataClient = new RiskScoreDataClient({
          logger,
          kibanaVersion,
          esClient: client,
          soClient: savedObjectsClient,
          namespace: spaceId,
        });

        const entries = await riskScoreDataClient.getRiskScoreHistory({
          entityType: identifierType,
          entityId: historyEntityId,
          range: { gte: from, lte: to },
          scoreType,
          interval: bucketInterval,
          includeContributions,
        });
        telemetryTracker.recordResultCount(entries.length);

        // 2 - Build the chart attachment
        const bucketIntervalLabel = `${bucketInterval.value}${bucketInterval.unit}`;
        const attachmentLabel = `${identifierType}: ${identifier}`;

        const attachmentResult = await ensureRiskScoreHistoryAttachment({
          attachments,
          id: buildRiskScoreHistoryAttachmentId(identifierType, entityStoreId, scoreType),
          data: {
            attachmentLabel,
            identifierType,
            identifier,
            entityStoreId,
            from,
            to,
            bucketInterval: bucketIntervalLabel,
            scoreType,
            entries,
          },
          description: attachmentLabel,
          logger,
        });

        // 3 - Build the tool output
        const dataOutput = {
          entityId: entityStoreId,
          entityType: identifierType,
          from,
          to,
          bucketInterval: bucketIntervalLabel,
          scoreType,
          includeContributions,
          entries,
        };
        // Put renderTag first so the model sees the pre-formatted tag before fields it might misuse to invent an id.
        const toolOutput: Record<string, unknown> = attachmentResult
          ? {
              renderTag: buildRenderAttachmentTag(attachmentResult),
              attachmentId: attachmentResult.attachmentId,
              version: attachmentResult.version,
              ...dataOutput,
            }
          : dataOutput;

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: toolOutput,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        logger.error(
          `Error in ${SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID} tool: ${errorMessage}`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error fetching risk score history: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
