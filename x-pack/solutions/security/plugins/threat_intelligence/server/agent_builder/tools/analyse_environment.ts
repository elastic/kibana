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
import { THREAT_INTEL_TOOL_IDS } from '../../../common';

/**
 * Customer profile read used by the upcoming environment-aware feed
 * recommendations flow. Returns a coarse-grained view of:
 *
 *   - which integration data streams have current activity,
 *   - the OS family mix (windows / linux / macos),
 *   - the cloud-provider mix (aws / gcp / azure / unknown).
 *
 * Lives in the **registry tool slot** so it does not consume one of the
 * skill's 7 inline tool slots. The orchestrating agent calls it through the
 * registry when it needs to tailor advice — e.g. "you have heavy AWS
 * coverage but no Azure feeds enabled".
 */
const analyseEnvironmentSchema = z.object({
  lookback_days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .optional()
    .default(7)
    .describe('How many days back to sample for activity. Defaults to 7.'),
  index_patterns: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Override the index patterns the profile is built from. Defaults to a curated set ' +
        'covering Elastic Defend, AWS, Azure, GCP, network traffic, and vulnerability scanners.'
    ),
});

const DEFAULT_INDEX_PATTERNS = [
  'logs-*',
  'metrics-endpoint.*',
  'logs-aws.*',
  'logs-azure.*',
  'logs-gcp.*',
  'logs-network_traffic.*',
  'logs-vulnerability.*',
];

interface BucketCount {
  key: string;
  doc_count: number;
}
interface EnvAggregations {
  per_data_stream?: { buckets: BucketCount[] };
  per_os_family?: { buckets: BucketCount[] };
  per_cloud_provider?: { buckets: BucketCount[] };
}

export const analyseEnvironmentTool: BuiltinToolDefinition<typeof analyseEnvironmentSchema> = {
  id: THREAT_INTEL_TOOL_IDS.analyseEnvironment,
  type: ToolType.builtin,
  description:
    'Profile the customer environment to tailor threat-intelligence feed recommendations. ' +
    'Returns: (a) active integration data streams with hit counts; (b) the OS family mix ' +
    '(windows / linux / macos); (c) the cloud-provider mix (aws / gcp / azure). Use this ' +
    'before suggesting which threat-intel sources to enable, or when answering "which feeds ' +
    'cover what I actually run?".',
  schema: analyseEnvironmentSchema,
  tags: ['threat-intel', 'environment-profile'],
  handler: async (
    { lookback_days: lookbackDays, index_patterns: indexPatterns },
    { esClient, logger }
  ) => {
    const from = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const indices = indexPatterns?.length ? indexPatterns : DEFAULT_INDEX_PATTERNS;

    try {
      const response = await esClient.asCurrentUser.search({
        index: indices,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        track_total_hits: true,
        query: { range: { '@timestamp': { gte: from } } },
        aggs: {
          per_data_stream: {
            terms: { field: 'data_stream.dataset', size: 50, missing: '<unknown>' },
          },
          per_os_family: {
            terms: { field: 'host.os.family', size: 10, missing: '<unknown>' },
          },
          per_cloud_provider: {
            terms: { field: 'cloud.provider', size: 10, missing: '<unknown>' },
          },
        },
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;
      const aggs = response.aggregations as EnvAggregations | undefined;
      const activeDataStreams = (aggs?.per_data_stream?.buckets ?? []).map((b) => ({
        dataset: b.key,
        doc_count: b.doc_count,
      }));
      const osMix = (aggs?.per_os_family?.buckets ?? []).map((b) => ({
        family: b.key,
        doc_count: b.doc_count,
      }));
      const cloudMix = (aggs?.per_cloud_provider?.buckets ?? []).map((b) => ({
        provider: b.key,
        doc_count: b.doc_count,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: total === 0 ? 'no_environment_activity' : 'environment_profile_computed',
              lookback_days: lookbackDays,
              counts: {
                total_docs: total,
                active_data_streams: activeDataStreams.length,
                os_families: osMix.length,
                cloud_providers: cloudMix.length,
              },
              active_data_streams: activeDataStreams,
              os_mix: osMix,
              cloud_mix: cloudMix,
              next_step:
                total === 0
                  ? 'No matching data in the lookback window. The user may not have any ' +
                    'integrations enabled yet — recommend onboarding before suggesting feeds.'
                  : 'Cross-reference the active data streams + cloud mix with the ' +
                    'threat-intel sources catalog (via `threat_intel.search_reports` tags ' +
                    'and the manage-sources flow) to recommend feeds aligned with what the ' +
                    'environment actually runs.',
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`analyse_environment failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `Failed to profile environment: ${(err as Error).message}. ` +
                `Verify the current user has read privileges on at least one of: ` +
                `${indices.join(', ')}.`,
            },
          },
        ],
      };
    }
  },
};
