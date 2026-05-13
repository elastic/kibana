/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  GLOBAL_SPACE_ID,
  SEVERITY_LEVELS,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REPORTS_DATA_STREAM,
} from '../../../common';

const ingestReportSchema = z
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
      'dedup, and indexed with `source.type: "manual"`. The fingerprint key uses op_type:create ' +
      'so re-pasting the same content is a no-op.'
  );

const fingerprint = (text: string): string =>
  createHash('sha256').update(text.trim().normalize('NFKC')).digest('hex');

export const ingestReportTool: BuiltinSkillBoundedTool<typeof ingestReportSchema> = {
  id: THREAT_INTEL_TOOL_IDS.ingestReport,
  type: ToolType.builtin,
  description:
    'Ingest one threat intelligence report (analyst paste / ad-hoc URL / vendor advisory) ' +
    'into the source-agnostic `.kibana-threat-reports-*` data stream. The report is fingerprinted ' +
    'for dedup so re-submitting the same content is a no-op.',
  schema: ingestReportSchema,
  handler: async (
    {
      title,
      body_text: bodyText,
      source_name: sourceName,
      source_url: sourceUrl,
      severity,
      language,
    },
    { esClient, logger, spaceId }
  ) => {
    const fp = fingerprint(`${title}\n${bodyText}`);
    const now = new Date().toISOString();

    try {
      // Look up duplicates first to avoid the data stream rejecting the create on
      // primary; the data stream itself doesn't expose op_type:create idiomatically,
      // so we do an explicit precheck.
      const existing = await esClient.asCurrentUser.search({
        index: THREAT_REPORTS_DATA_STREAM,
        size: 1,
        _source: false,
        // Dedup is scoped to the current space + the global sentinel: the same
        // advisory in another space is *not* a duplicate (per-space isolation),
        // but a global-tagged seed is everyone's canonical copy.
        query: {
          bool: {
            filter: [
              { term: { content_fingerprint: fp } },
              { terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } },
            ],
          },
        },
      });

      const total =
        typeof existing.hits.total === 'number'
          ? existing.hits.total
          : existing.hits.total?.value ?? 0;

      if (total > 0) {
        const existingId = existing.hits.hits[0]._id;
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                status: 'duplicate',
                content_fingerprint: fp,
                report_id: existingId,
                message:
                  'Report content already ingested. Returning the canonical document id without writing a new copy.',
              },
            },
          ],
        };
      }

      const indexResponse = await esClient.asCurrentUser.index({
        index: THREAT_REPORTS_DATA_STREAM,
        document: {
          '@timestamp': now,
          content_fingerprint: fp,
          space_id: spaceId,
          source: {
            type: 'manual',
            name: sourceName,
            url: sourceUrl,
            adapter_id: 'manual:analyst-paste',
          },
          content: {
            title,
            body_text: bodyText,
            language,
          },
          severity: {
            level: severity,
            score:
              severity === 'critical'
                ? 90
                : severity === 'high'
                ? 70
                : severity === 'medium'
                ? 40
                : 20,
          },
          provenance: {
            ingested_at: now,
            extraction_method: 'pending',
          },
        },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: 'ingested',
              report_id: indexResponse._id,
              content_fingerprint: fp,
              message:
                'Report ingested. Workflow 2 (`nl_extraction_behavioral`) will pick it up on the next run, ' +
                'or invoke `threat_intel.hunt_behavior` directly to extract behaviors now.',
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`ingest_report failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to ingest report: ${(err as Error).message}` },
          },
        ],
      };
    }
  },
};
