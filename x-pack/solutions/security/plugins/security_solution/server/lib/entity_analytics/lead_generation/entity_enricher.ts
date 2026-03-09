/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getRiskScoreTimeSeriesIndex } from '../../../../common/entity_analytics/risk_engine/indices';
import type { LeadEntity } from './types';
import { getEntityField, groupEntitiesByType, entityToKey } from './observation_modules/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALERTS_LOOKBACK = 'now-7d';
const RISK_HISTORY_LOOKBACK = 'now-90d';
const MAX_TOP_ALERTS = 5;
const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts-*';

// ---------------------------------------------------------------------------
// Enrichment types
// ---------------------------------------------------------------------------

export interface RiskEnrichment {
  readonly currentScore: number;
  readonly level: string;
  readonly history: ReadonlyArray<{ readonly date: string; readonly score: number }>;
}

export interface AlertEnrichment {
  readonly totalAlerts: number;
  readonly severityCounts: Readonly<Record<string, number>>;
  readonly topRuleNames: readonly string[];
  readonly topAlerts: ReadonlyArray<{
    readonly id: string;
    readonly severity: string;
    readonly ruleName: string;
    readonly riskScore: number;
    readonly timestamp: string;
  }>;
}

export interface EntityEnrichment {
  readonly risk?: RiskEnrichment;
  readonly alerts?: AlertEnrichment;
  readonly isPrivileged: boolean;
  readonly assetCriticality?: string;
}

export interface EnrichedLeadEntity extends LeadEntity {
  readonly enrichment: EntityEnrichment;
}

// ---------------------------------------------------------------------------
// Entity Enricher
//
// Pre-fetches contextual data (risk history, alert summaries, attributes)
// for a batch of entities. The enrichment data can be used by:
//   - The scoring engine for more informed prioritisation
//   - Content synthesis (especially LLM) for richer descriptions
//   - The final lead output for display in the UI
// ---------------------------------------------------------------------------

export interface EntityEnricherDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
  readonly alertsIndexPattern?: string;
}

export interface EntityEnricher {
  /** Enrich a batch of entities with risk history, alert summaries, and attributes. */
  enrich(entities: readonly LeadEntity[]): Promise<EnrichedLeadEntity[]>;
}

export const createEntityEnricher = ({
  esClient,
  logger,
  spaceId,
  alertsIndexPattern = DEFAULT_ALERTS_INDEX,
}: EntityEnricherDeps): EntityEnricher => ({
  async enrich(entities: readonly LeadEntity[]): Promise<EnrichedLeadEntity[]> {
    if (entities.length === 0) return [];

    const [riskHistoryMap, alertSummaryMap] = await Promise.all([
      fetchRiskHistory(esClient, spaceId, entities, logger),
      fetchAlertSummaries(esClient, alertsIndexPattern, entities, logger),
    ]);

    return entities.map((entity) => {
      const key = entityToKey(entity);
      return {
        ...entity,
        enrichment: {
          risk: buildRiskEnrichment(entity, riskHistoryMap.get(key)),
          alerts: alertSummaryMap.get(key),
          isPrivileged: extractIsPrivileged(entity),
          assetCriticality: extractAssetCriticality(entity),
        },
      };
    });
  },
});

// ---------------------------------------------------------------------------
// Entity record accessors
// ---------------------------------------------------------------------------

const extractIsPrivileged = (entity: LeadEntity): boolean => {
  const attrs = getEntityField(entity)?.attributes as { privileged?: boolean } | undefined;
  return attrs?.privileged === true;
};

const extractAssetCriticality = (entity: LeadEntity): string | undefined => {
  const asset = (entity.record as Record<string, unknown>).asset as
    | { criticality?: string }
    | undefined;
  return asset?.criticality ?? undefined;
};

const buildRiskEnrichment = (
  entity: LeadEntity,
  history: Array<{ date: string; score: number }> | undefined
): RiskEnrichment | undefined => {
  const entityField = getEntityField(entity);
  if (!entityField) return undefined;

  const risk = entityField.risk as
    | { calculated_score_norm?: unknown; calculated_level?: string }
    | undefined;
  if (risk?.calculated_score_norm == null) return undefined;

  const currentScore = Number(risk.calculated_score_norm);
  if (Number.isNaN(currentScore)) return undefined;

  return {
    currentScore,
    level: risk.calculated_level ?? 'Unknown',
    history: history ?? [],
  };
};

// ---------------------------------------------------------------------------
// Risk history fetching
//
// Single aggregation query per entity type. Returns daily average risk
// scores over the last 90 days, ordered oldest → newest.
// ---------------------------------------------------------------------------

const fetchRiskHistory = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: readonly LeadEntity[],
  logger: Logger
): Promise<Map<string, Array<{ date: string; score: number }>>> => {
  const result = new Map<string, Array<{ date: string; score: number }>>();

  for (const [entityType, group] of groupEntitiesByType([...entities]).entries()) {
    const names = group.map((e) => e.name);
    const index = getRiskScoreTimeSeriesIndex(spaceId);

    try {
      const response = await esClient.search({
        index,
        size: 0,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            filter: [
              { terms: { [`${entityType}.name`]: names } },
              { range: { '@timestamp': { gte: RISK_HISTORY_LOOKBACK, lte: 'now' } } },
            ],
          },
        },
        aggs: {
          by_entity: {
            terms: { field: `${entityType}.name`, size: names.length },
            aggs: {
              scores_over_time: {
                date_histogram: { field: '@timestamp', calendar_interval: 'day' },
                aggs: {
                  avg_score: { avg: { field: `${entityType}.risk.calculated_score_norm` } },
                },
              },
            },
          },
        },
      });

      const buckets = ((response.aggregations?.by_entity as Record<string, unknown>)?.buckets ??
        []) as Array<{
        key: string;
        scores_over_time: {
          buckets: Array<{ key_as_string: string; avg_score: { value: number | null } }>;
        };
      }>;

      for (const bucket of buckets) {
        const history = bucket.scores_over_time.buckets
          .filter((b) => b.avg_score.value != null)
          .map((b) => ({
            date: b.key_as_string,
            score: b.avg_score.value as number,
          }));
        result.set(`${entityType}:${bucket.key}`, history);
      }
    } catch (error) {
      logger.warn(
        `[LeadGeneration][EntityEnricher] Failed to fetch risk history for ${entityType}: ${error}`
      );
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// Alert summary fetching
//
// Single aggregation query covering all entities. Produces severity
// breakdown, top rule names, and top alerts per entity.
// ---------------------------------------------------------------------------

const fetchAlertSummaries = async (
  esClient: ElasticsearchClient,
  alertsIndex: string,
  entities: readonly LeadEntity[],
  logger: Logger
): Promise<Map<string, AlertEnrichment>> => {
  const result = new Map<string, AlertEnrichment>();

  const userNames = entities.filter((e) => e.type === 'user').map((e) => e.name);
  const hostNames = entities.filter((e) => e.type === 'host').map((e) => e.name);

  const entityTerms: Array<Record<string, unknown>> = [
    ...(userNames.length > 0 ? [{ terms: { 'user.name': userNames } }] : []),
    ...(hostNames.length > 0 ? [{ terms: { 'host.name': hostNames } }] : []),
  ];
  if (entityTerms.length === 0) return result;

  const alertSubAggs = {
    severity_breakdown: { terms: { field: 'kibana.alert.severity', size: 10 } },
    distinct_rules: { terms: { field: 'kibana.alert.rule.name', size: 50 } },
    top_alerts: {
      top_hits: {
        size: MAX_TOP_ALERTS,
        sort: [{ 'kibana.alert.risk_score': { order: 'desc' as const } }],
        _source: false,
        fields: [
          'kibana.alert.severity',
          'kibana.alert.rule.name',
          'kibana.alert.risk_score',
          '@timestamp',
        ],
      },
    },
  };

  try {
    const response = await esClient.search({
      index: alertsIndex,
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            { bool: { should: entityTerms, minimum_should_match: 1 } },
            { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
            { range: { '@timestamp': { gte: ALERTS_LOOKBACK, lte: 'now' } } },
          ],
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
      aggs: {
        by_user: {
          terms: { field: 'user.name', size: entities.length },
          aggs: alertSubAggs,
        },
        by_host: {
          terms: { field: 'host.name', size: entities.length },
          aggs: alertSubAggs,
        },
      },
    });

    parseAlertBuckets(response.aggregations?.by_user, 'user', result);
    parseAlertBuckets(response.aggregations?.by_host, 'host', result);
  } catch (error) {
    logger.warn(`[LeadGeneration][EntityEnricher] Failed to fetch alert summaries: ${error}`);
  }

  return result;
};

interface AlertBucket {
  key: string;
  doc_count: number;
  severity_breakdown: { buckets: Array<{ key: string; doc_count: number }> };
  distinct_rules: { buckets: Array<{ key: string; doc_count: number }> };
  top_alerts: { hits: { hits: Array<{ _id: string; fields?: Record<string, unknown[]> }> } };
}

const parseAlertBuckets = (
  agg: unknown,
  entityType: string,
  target: Map<string, AlertEnrichment>
): void => {
  const buckets = ((agg as Record<string, unknown>)?.buckets ?? []) as AlertBucket[];

  for (const bucket of buckets) {
    const topAlerts = bucket.top_alerts.hits.hits.map(({ _id, fields = {} }) => ({
      id: _id,
      severity: String(fields['kibana.alert.severity']?.[0] ?? 'unknown'),
      ruleName: String(fields['kibana.alert.rule.name']?.[0] ?? 'unknown'),
      riskScore: Number(fields['kibana.alert.risk_score']?.[0] ?? 0),
      timestamp: String(fields['@timestamp']?.[0] ?? ''),
    }));

    target.set(`${entityType}:${bucket.key}`, {
      totalAlerts: bucket.doc_count,
      severityCounts: Object.fromEntries(
        bucket.severity_breakdown.buckets.map((b) => [b.key, b.doc_count])
      ),
      topRuleNames: bucket.distinct_rules.buckets.map((r) => r.key),
      topAlerts,
    });
  }
};
