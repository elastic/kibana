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
  report_source?: string;
  report_category?: string;
  technique_id: string;
  technique_ids?: string[];
  technique_name?: string;
  hypothesis: string;
  hypothesis_rationale?: string;
  confidence: number;
  severity: string;
  risk_score: number;
  proposed_esql_rule: string;
  rule_name?: string;
  env_hits?: number;
  tier?: string;
  status?: 'new' | 'deployed';
  deployed_rule_id?: string;
  deployed_at?: string;
  affected_assets: {
    hosts: string[];
    users: string[];
  } & Record<string, string[] | undefined>;
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
  status?: 'new' | 'deployed' | string;
  deployed_rule_id?: string;
  deployed_at?: string;
}

interface ReportEnrichment {
  sourceName?: string;
  category?: string;
  envHits?: number;
  title?: string;
}

const deriveTierLabel = (tier1Status: string, huntRunStatus: string): string | undefined => {
  const hasTier1 = Boolean(tier1Status);
  const hasTier2 =
    huntRunStatus === 'complete' ||
    huntRunStatus === 'completed' ||
    huntRunStatus === 'tier2_complete' ||
    huntRunStatus.includes('tier2');
  if (hasTier1 && hasTier2) {
    return '1 + 2';
  }
  if (hasTier2) {
    return '2';
  }
  if (hasTier1) {
    return '1';
  }
  return undefined;
};

const loadReportEnrichment = async (
  esClient: ElasticsearchClient,
  reportIds: string[]
): Promise<Map<string, ReportEnrichment>> => {
  const uniqueIds = Array.from(new Set(reportIds.filter(Boolean)));
  const enrichment = new Map<string, ReportEnrichment>();
  if (uniqueIds.length === 0) {
    return enrichment;
  }

  try {
    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: uniqueIds.length,
      query: {
        ids: { values: uniqueIds },
      },
      _source: [
        'content.title',
        'source.name',
        'grouping.categories',
        'attribution.environment_hits_total',
      ],
    });

    for (const hit of response.hits.hits) {
      if (hit._id) {
        const source = hit._source as
          | {
              content?: { title?: string };
              source?: { name?: string };
              grouping?: { categories?: string[] };
              attribution?: { environment_hits_total?: number };
            }
          | undefined;
        const categories = source?.grouping?.categories ?? [];
        enrichment.set(hit._id, {
          title: source?.content?.title,
          sourceName: source?.source?.name,
          category: categories[0],
          envHits:
            typeof source?.attribution?.environment_hits_total === 'number'
              ? source.attribution.environment_hits_total
              : undefined,
        });
      }
    }
  } catch {
    // Enrichment is best-effort for Hub presentation; findings still render without it.
  }

  return enrichment;
};

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

  const rawFindings = response.hits.hits.map((hit) => {
    const source = (hit._source ?? {}) as FindingSource;
    return {
      id: hit._id ?? '',
      source,
    };
  });

  const reportEnrichment = await loadReportEnrichment(
    esClient,
    rawFindings.map((row) => row.source.report_id ?? '')
  );

  const findings: HuntFindingRow[] = rawFindings.map(({ id, source }) => {
    const reportId = source.report_id ?? '';
    const reportMeta = reportEnrichment.get(reportId);
    const tier1Status = source.tier1_status ?? '';
    const huntRunStatus = source.hunt_run_status ?? '';
    return {
      id,
      '@timestamp': source['@timestamp'] ?? '',
      report_id: reportId,
      report_title: source.report_title || reportMeta?.title,
      report_source: reportMeta?.sourceName,
      report_category: reportMeta?.category,
      technique_id: source.technique_id ?? '',
      technique_ids: source.technique_id ? [source.technique_id] : [],
      technique_name: source.technique_name,
      hypothesis: source.hypothesis ?? '',
      hypothesis_rationale: source.hypothesis_rationale,
      confidence: typeof source.confidence === 'number' ? source.confidence : 0,
      severity: source.severity ?? 'medium',
      risk_score: typeof source.risk_score === 'number' ? source.risk_score : 0,
      proposed_esql_rule: source.proposed_esql_rule ?? '',
      rule_name: source.rule_name,
      env_hits: reportMeta?.envHits,
      tier: deriveTierLabel(tier1Status, huntRunStatus),
      status: source.status === 'deployed' ? 'deployed' : 'new',
      deployed_rule_id: source.deployed_rule_id,
      deployed_at: source.deployed_at,
      affected_assets: {
        hosts: source.affected_assets?.hosts ?? [],
        users: source.affected_assets?.users ?? [],
      },
      tier1_status: tier1Status,
      hunt_run_status: huntRunStatus,
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
