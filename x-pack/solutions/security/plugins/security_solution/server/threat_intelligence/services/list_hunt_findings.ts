/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  THREAT_INTEL_HUNT_FINDINGS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms } from '../lib/space_filter';

export interface ListHuntFindingsParams {
  spaceId: string;
  from?: string;
  to?: string;
  min_confidence?: number;
  size?: number;
}

export interface HuntFindingRow {
  id: string;
  '@timestamp': string;
  report_id: string;
  report_title?: string;
  technique_id: string;
  technique_name?: string;
  hypothesis: string;
  hypothesis_rationale?: string;
  confidence: number;
  severity: string;
  risk_score: number;
  proposed_esql_rule: string;
  rule_name?: string;
  affected_assets: {
    hosts: string[];
    users: string[];
  };
  tier1_status: string;
  hunt_run_status: string;
}

export interface FeedbackLoopSummary {
  report_id: string;
  title: string;
  rank_score: number;
  corroborated_rank_score: number;
}

export interface ListHuntFindingsResult {
  findings: HuntFindingRow[];
  total: number;
  feedback_loop: FeedbackLoopSummary[];
}

interface FindingSource {
  '@timestamp'?: string;
  report_id?: string;
  report_title?: string;
  technique_id?: string;
  technique_name?: string;
  hypothesis?: string;
  hypothesis_rationale?: string;
  confidence?: number;
  severity?: string;
  risk_score?: number;
  proposed_esql_rule?: string;
  rule_name?: string;
  affected_assets?: { hosts?: string[]; users?: string[] };
  tier1_status?: string;
  hunt_run_status?: string;
}

export const listHuntFindings = async (
  esClient: ElasticsearchClient,
  params: ListHuntFindingsParams
): Promise<ListHuntFindingsResult> => {
  const size = Math.min(Math.max(params.size ?? 25, 1), 100);
  const filters: Record<string, unknown>[] = [buildSpaceFilterTerms(params.spaceId)];

  if (params.from || params.to) {
    filters.push({
      range: {
        '@timestamp': {
          ...(params.from ? { gte: params.from } : {}),
          ...(params.to ? { lte: params.to } : {}),
        },
      },
    });
  }

  if (typeof params.min_confidence === 'number') {
    filters.push({
      range: {
        confidence: { gte: params.min_confidence },
      },
    });
  }

  const [response, feedbackResponse] = await Promise.all([
    esClient.search({
      index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
      ignore_unavailable: true,
      size,
      track_total_hits: true,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: { filter: filters },
      },
    }),
    esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 3,
      query: {
        bool: {
          filter: [
            buildSpaceFilterTerms(params.spaceId),
            { exists: { field: 'corroborated_rank_score' } },
            { exists: { field: 'rank_score' } },
          ],
        },
      },
      sort: [{ corroborated_rank_score: { order: 'desc', missing: 0 } }],
      _source: ['content.title', 'rank_score', 'corroborated_rank_score'],
    }),
  ]);

  const totalRaw = response.hits.total;
  const total =
    typeof totalRaw === 'number'
      ? totalRaw
      : typeof totalRaw?.value === 'number'
      ? totalRaw.value
      : 0;

  const findings: HuntFindingRow[] = response.hits.hits.map((hit) => {
    const source = (hit._source ?? {}) as FindingSource;
    return {
      id: hit._id ?? '',
      '@timestamp': source['@timestamp'] ?? '',
      report_id: source.report_id ?? '',
      report_title: source.report_title,
      technique_id: source.technique_id ?? '',
      technique_name: source.technique_name,
      hypothesis: source.hypothesis ?? '',
      hypothesis_rationale: source.hypothesis_rationale,
      confidence: typeof source.confidence === 'number' ? source.confidence : 0,
      severity: source.severity ?? 'medium',
      risk_score: typeof source.risk_score === 'number' ? source.risk_score : 0,
      proposed_esql_rule: source.proposed_esql_rule ?? '',
      rule_name: source.rule_name,
      affected_assets: {
        hosts: source.affected_assets?.hosts ?? [],
        users: source.affected_assets?.users ?? [],
      },
      tier1_status: source.tier1_status ?? '',
      hunt_run_status: source.hunt_run_status ?? '',
    };
  });

  const feedbackLoop: FeedbackLoopSummary[] = feedbackResponse.hits.hits
    .map((hit) => {
      const source = hit._source as
        | {
            content?: { title?: string };
            rank_score?: number;
            corroborated_rank_score?: number;
          }
        | undefined;
      const rank = typeof source?.rank_score === 'number' ? source.rank_score : 0;
      const corroborated =
        typeof source?.corroborated_rank_score === 'number' ? source.corroborated_rank_score : 0;
      if (!(corroborated > rank)) {
        return undefined;
      }
      return {
        report_id: hit._id ?? '',
        title: source?.content?.title?.trim() || hit._id || '',
        rank_score: rank,
        corroborated_rank_score: corroborated,
      };
    })
    .filter((row): row is FeedbackLoopSummary => row !== undefined);

  return { findings, total, feedback_loop: feedbackLoop };
};
