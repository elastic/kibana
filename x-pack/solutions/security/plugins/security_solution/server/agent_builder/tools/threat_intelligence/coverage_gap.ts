/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  COVERAGE_GAP_API_PATH,
  SEVERITY_LEVELS,
  SOURCE_TYPES,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { coverageGap } from '../../../threat_intelligence/services';
import {
  buildCoverageGapHeatmapAttachmentId,
  buildRenderAttachmentTag,
  ensureMitreHeatmapAttachment,
} from './threat_intel_attachment_utils';

/**
 * Thin Agent Builder tool wrapper for the `coverage_gap` domain action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `COVERAGE_GAP_API_PATH`.
 */
const coverageGapSchema = z.object({
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .describe('Window of `.kibana-threat-reports-*` to evaluate against current rule coverage.'),
  tags: z
    .array(z.string().min(1))
    .optional()
    .describe('Restrict to reports matching any of these tags (joins on `tags` keyword field).'),
  source_types: z
    .array(z.enum(SOURCE_TYPES))
    .optional()
    .describe('Restrict to a subset of source types.'),
  min_severity: z
    .enum(SEVERITY_LEVELS)
    .optional()
    .describe('Minimum severity threshold for in-the-wild techniques.'),
  max_techniques: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of in-wild technique rows to return.'),
});

export const coverageGapTool: BuiltinSkillBoundedTool<typeof coverageGapSchema> = {
  id: THREAT_INTEL_TOOL_IDS.coverageGap,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${COVERAGE_GAP_API_PATH}. ` +
    'Compute the gap between ATT&CK techniques observed in recent threat reports and ATT&CK ' +
    "techniques covered by the customer's Detection Engine rules. Distinguishes enabled coverage " +
    'from disabled rules that should be re-enabled (`coverage_recommendation: enable_existing`) ' +
    'versus techniques with no rule (`create_rule`). When techniques are returned, ' +
    'automatically stores a `threat-intel-mitre-heatmap` attachment (`mode: "coverage"`) and ' +
    'includes a `renderTag` in the tool result. Inside Kibana, prefer the route via `kibana-request`.',
  schema: coverageGapSchema,
  handler: async (params, { esClient, savedObjectsClient, logger, attachments }) => {
    try {
      const data = await coverageGap(esClient.asCurrentUser, savedObjectsClient, logger, params);

      let renderTag: string | undefined;
      if (data.techniques.length > 0) {
        const payload = data.attachment_hint.payload;
        const attachmentResult = await ensureMitreHeatmapAttachment({
          attachments,
          id: buildCoverageGapHeatmapAttachmentId(params),
          payload,
          description: `MITRE coverage heatmap (${payload.time_range_label})`,
          logger,
        });
        if (attachmentResult) {
          renderTag = buildRenderAttachmentTag({
            attachmentId: attachmentResult.attachmentId,
            version: attachmentResult.version,
          });
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              ...data,
              ...(renderTag
                ? {
                    renderTag,
                    attachmentId: buildCoverageGapHeatmapAttachmentId(params),
                  }
                : {}),
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`coverage_gap failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to compute coverage gap: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
