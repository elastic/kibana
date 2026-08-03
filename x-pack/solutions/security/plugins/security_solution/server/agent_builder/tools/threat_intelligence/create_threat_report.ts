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
  CREATE_THREAT_REPORT_API_PATH,
  SEVERITY_LEVELS,
  THREAT_INTEL_TOOL_IDS,
} from '../../../../common/threat_intelligence/hub';
import { createThreatReport } from '../../../threat_intelligence/services';

/**
 * Thin Agent Builder tool wrapper for the `create_threat_report` domain action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `CREATE_THREAT_REPORT_API_PATH`. This tool exists for 3rd party agent
 * portability and delegates to the same shared service.
 */
const createThreatReportSchema = z
  .object({
    title: z.string().min(1).describe('Report title (will be embedded for semantic search).'),
    body_text: z
      .string()
      .min(1)
      .describe('Report body in plain text. HTML and markdown are accepted but should be cleaned.'),
    source_name: z
      .string()
      .min(1)
      .describe(
        'Name of the source (e.g. "BleepingComputer", "analyst:alice@corp"). Stored in `source.name`.'
      ),
    source_url: z.string().url().optional().describe('Canonical URL of the source document.'),
    severity: z
      .enum(SEVERITY_LEVELS)
      .optional()
      .default('medium')
      .describe('Initial severity classification. Workflow 2 may revise this during extraction.'),
    language: z.string().optional().default('en').describe('IETF language tag (default "en").'),
  })
  .describe(
    'Ingest a single threat intelligence report into the `.kibana-threat-reports-*` data stream. ' +
      'Use when the analyst pastes a URL, blog post, vendor advisory, or incident postmortem ' +
      'directly into chat. The document is normalized, fingerprinted (sha256 of body_text) for ' +
      'dedup, and indexed with `source.type: "manual"`.'
  );

export const createThreatReportTool: BuiltinSkillBoundedTool<typeof createThreatReportSchema> = {
  id: THREAT_INTEL_TOOL_IDS.createThreatReport,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${CREATE_THREAT_REPORT_API_PATH}. ` +
    'Ingest one threat intelligence report (analyst paste / ad-hoc URL / vendor advisory) ' +
    'into the source-agnostic `.kibana-threat-reports-*` data stream. The report is fingerprinted ' +
    'for dedup so re-submitting the same content is a no-op. Agent Builder should call this ' +
    'tool directly; native Workflows and UI surfaces use the matching HTTP route.',
  schema: createThreatReportSchema,
  handler: async (params, { esClient, logger, spaceId }) => {
    try {
      const data = await createThreatReport(esClient.asCurrentUser, logger, spaceId, params);
      return { results: [{ type: ToolResultType.other, data }] };
    } catch (err) {
      logger.warn(`create_threat_report failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to create threat report: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
