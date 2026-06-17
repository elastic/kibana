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
  DETECTION_ACTIONABILITY_LEVELS,
  REPORT_SORT_OPTIONS,
  SEARCH_REPORTS_API_PATH,
  SEVERITY_LEVELS,
  SOURCE_TYPES,
  THREAT_CATEGORIES,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REGIONS,
} from '../../../../common/threat_intelligence/hub';
import { searchReports } from '../../../threat_intelligence/services';
import {
  buildDigestReportTableAttachmentId,
  buildRenderAttachmentTag,
  ensureReportTableAttachment,
  formatTimeRangeLabel,
  mapSearchReportHitToTableRow,
} from './threat_intel_attachment_utils';

/**
 * Thin Agent Builder tool wrapper for the `search_reports` domain action.
 *
 * Per the Agent Builder architecture guidance, the canonical execution
 * surface is the internal HTTP route at `SEARCH_REPORTS_API_PATH` and the
 * orchestrating agent should prefer `execute_workflow_step` with
 * `kibana-request` against that route. This tool is retained only as a
 * portability surface for 3rd party agents (Claude, Cursor) that can't
 * reach Kibana APIs natively — it delegates to the same shared service
 * the route uses, so the two paths can never drift.
 */
const searchReportsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Free-text query. Searched semantically against `content.title` and `content.body_text` ' +
        'and lexically against the BM25 mirror fields. Combined via RRF.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of reports to return.'),
  source_types: z
    .array(z.enum(SOURCE_TYPES))
    .optional()
    .describe('Restrict to a subset of source types (e.g. ["rss", "vendor_api"]).'),
  min_severity: z
    .enum(SEVERITY_LEVELS)
    .optional()
    .describe('Minimum severity level to include. Filters out reports below this threshold.'),
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .optional()
    .describe('Restrict to reports ingested in this time window.'),
  categories: z
    .array(z.enum(THREAT_CATEGORIES))
    .optional()
    .describe(
      'Restrict to reports whose closed-set categories overlap any of the given values ' +
        '(e.g. ["ransomware", "supply-chain"]). Categories are populated by the stage-2 ' +
        'enrichment in the `nl_extraction_behavioral` workflow.'
    ),
  regions: z
    .array(z.enum(THREAT_REGIONS))
    .optional()
    .describe(
      'Restrict to reports tagged with any of the given macro geographic regions ' +
        '(e.g. ["north-america", "europe"]). Backed by `geography.regions` on the report.'
    ),
  detection_actionability: z
    .array(z.enum(DETECTION_ACTIONABILITY_LEVELS))
    .optional()
    .describe(
      'Closed-set classifier filter — `informational | iocs_only | ttps_present | ' +
        'rule_candidate`. Use `["rule_candidate"]` (or include `"ttps_present"`) when the ' +
        'analyst asks for "actionable", "high-quality", or "rule-ready" reports. Backed by ' +
        '`extracted.detection_actionability` populated by the stage-2 enrichment in the ' +
        '`nl_extraction_behavioral` workflow.'
    ),
  sort_by: z
    .enum(REPORT_SORT_OPTIONS)
    .optional()
    .describe(
      'Sort mode. Omit (or pass `"relevance"`) for hybrid semantic + BM25 RRF ranking — ' +
        'best for free-text discovery. Pass `"rank"` for the tradecraft-style ' +
        'multiplicative `severity.score * extracted.relevance` composite — best for ' +
        '"give me the most actionable reports right now" digest / top-N flows. ' +
        '`"severity"` and `"recency"` are single-dimension sorts on `severity.score` ' +
        'and `@timestamp` respectively. In every non-RRF mode the free-text `query` ' +
        'is still applied as a BM25 must-match so the result set is scoped to ' +
        'documents that mention the query terms — only the ordering changes.'
    ),
});

export const searchReportsTool: BuiltinSkillBoundedTool<typeof searchReportsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.searchReports,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${SEARCH_REPORTS_API_PATH}. ` +
    'Semantic + BM25 hybrid search over the `.kibana-threat-reports-*` data stream (ingested ' +
    'RSS/STIX/vendor feeds — NOT customer logs or alerts). **Required first step** for digest, ' +
    'weekly summary, CISO brief, ransomware/supply-chain topic, or "what threat intel do we have" ' +
    'questions: call this before answering or suggesting feed setup. Returns `{ total, reports[] }`; ' +
    'only treat the database as empty when `total` is 0 after retrying without `categories` if ' +
    'the first search used category filters. Prefer `sort_by: "rank"` and `time_range` last 7d ' +
    'for weekly digests.',
  schema: searchReportsSchema,
  handler: async (params, { esClient, logger, spaceId, attachments }) => {
    try {
      const data = await searchReports(esClient.asCurrentUser, logger, spaceId, params);

      let renderTag: string | undefined;
      if (data.reports.length > 0) {
        const payload = {
          attachmentLabel: `Threat intel: ${params.query}`,
          time_range_label: formatTimeRangeLabel(params.time_range),
          scope: {
            query: params.query,
            ...(params.time_range ? { time_range: params.time_range } : {}),
            ...(params.categories?.length ? { categories: params.categories } : {}),
            ...(params.regions?.length ? { regions: params.regions } : {}),
          },
          reports: data.reports.map(mapSearchReportHitToTableRow),
        };
        const attachmentResult = await ensureReportTableAttachment({
          attachments,
          id: buildDigestReportTableAttachmentId(params),
          payload,
          description: `Threat intelligence report table (${payload.time_range_label})`,
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
              ...(renderTag ? { renderTag, attachmentId: buildDigestReportTableAttachmentId(params) } : {}),
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`search_reports failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `Failed to search threat reports: ${(err as Error).message}. ` +
                `If the error mentions inference, the cluster may be missing a default ` +
                `text_embedding endpoint — see the plugin README for setup.`,
            },
          },
        ],
      };
    }
  },
};
