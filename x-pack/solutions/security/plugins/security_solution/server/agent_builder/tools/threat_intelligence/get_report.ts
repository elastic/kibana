/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { THREAT_INTEL_TOOL_IDS } from '../../../../common/threat_intelligence/hub';
import { fetchCandidateBodyText } from '../../../threat_intelligence/services';

const getReportSchema = z.object({
  report_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .describe(
      'List of Elasticsearch _ids from `.kibana-threat-reports-*` to fetch. ' +
        'Accepts 1–50 IDs per call; IDs not found are silently omitted from the response.'
    ),
});

export const getReportTool: BuiltinToolDefinition<typeof getReportSchema> = {
  id: THREAT_INTEL_TOOL_IDS.getReport,
  type: ToolType.builtin,
  description:
    'Fetch full report text + metadata (title, source type, source name, URL, body) for a ' +
    'batch of report_ids. Use to retrieve source material for candidates before synthesizing ' +
    'yourself. Companion to `correlate_synthesis_pack`: call get_report(picks[].report_id) to ' +
    'load the full text of the blinded candidate set. Returns one entry per found id; ' +
    'not-found ids are silently omitted (ignore_unavailable).',
  schema: getReportSchema,
  tags: ['threat-intel', 'correlation'],
  handler: async ({ report_ids }, { esClient }) => {
    try {
      const bodyMap = await fetchCandidateBodyText(esClient.asCurrentUser, report_ids);

      const reports = [...bodyMap.entries()].map(([report_id, entry]) => ({
        report_id,
        title: entry.title,
        source_type: entry.sourceType,
        source_name: entry.sourceName,
        url: entry.url,
        body_text: entry.bodyText,
      }));

      return { results: [{ type: ToolResultType.other, data: { reports } }] };
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `get_report failed: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
