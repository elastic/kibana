/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EnrichmentStrategy, EnrichedEntity, EnrichmentResult } from '../enrichment';
import type { ExtractedEntity, PipelineConfig } from '../types';

/**
 * Enriches entities by querying ML anomaly results.
 * Looks for anomalous behavior associated with hosts, users, and IPs
 * to boost their risk signal before case matching.
 */
export class MlAnomalyEnrichment implements EnrichmentStrategy {
  readonly id = 'ml_anomaly';
  readonly name = 'ML Anomaly Score Enrichment';

  constructor(private readonly esClient: ElasticsearchClient) {}

  async enrich({
    entities,
    logger,
  }: {
    entities: ExtractedEntity[];
    config: PipelineConfig;
    logger: Logger;
  }): Promise<EnrichmentResult> {
    const entityTypes = new Set(['hostname', 'username', 'ipv4', 'ipv6']);
    const lookupEntities = entities.filter((e) => entityTypes.has(e.typeKey));

    if (lookupEntities.length === 0) {
      return {
        enrichedEntities: entities.map((e) => ({ ...e })),
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    const influencerValues = lookupEntities.map((e) => e.value);
    let anomalyMap: Map<string, number>;

    try {
      const result = await this.esClient.search({
        index: '.ml-anomalies-*',
        size: 500,
        query: {
          bool: {
            must: [
              { range: { timestamp: { gte: 'now-7d' } } },
              { range: { record_score: { gte: 50 } } },
            ],
            should: [
              { terms: { 'influencers.influencer_field_values': influencerValues } },
              { terms: { by_field_value: influencerValues } },
            ],
            minimum_should_match: 1,
          },
        },
        _source: ['record_score', 'by_field_value', 'influencers'],
      });

      anomalyMap = new Map();
      for (const hit of result.hits.hits) {
        const src = hit._source as Record<string, unknown> | undefined;
        if (src) {
          const score = (src.record_score as number) ?? 0;
          const byVal = src.by_field_value as string | undefined;

          if (byVal) {
            const existing = anomalyMap.get(byVal.toLowerCase()) ?? 0;
            anomalyMap.set(byVal.toLowerCase(), Math.max(existing, score));
          }

          const influencers = src.influencers as
            | Array<{
                influencer_field_values: string[];
              }>
            | undefined;
          if (influencers) {
            for (const inf of influencers) {
              for (const val of inf.influencer_field_values ?? []) {
                const existing = anomalyMap.get(val.toLowerCase()) ?? 0;
                anomalyMap.set(val.toLowerCase(), Math.max(existing, score));
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`ML anomaly lookup failed: ${error instanceof Error ? error.message : error}`);
      return {
        enrichedEntities: entities.map((e) => ({ ...e })),
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    let enrichedCount = 0;
    const enrichedEntities: EnrichedEntity[] = entities.map((entity) => {
      const anomalyScore = anomalyMap.get(entity.value.toLowerCase());
      if (anomalyScore != null && anomalyScore > 0) {
        enrichedCount++;
        return {
          ...entity,
          enrichments: [
            ...((entity as EnrichedEntity).enrichments ?? []),
            {
              source: 'ml_anomaly',
              type: 'ml_anomaly' as const,
              severity: anomalyScore >= 75 ? ('critical' as const) : ('high' as const),
              details: { anomaly_score: anomalyScore },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return { ...entity };
    });

    logger.info(`ML enrichment: ${enrichedCount}/${entities.length} entities had anomalies`);

    return {
      enrichedEntities,
      stats: { totalEnriched: enrichedCount, bySource: { ml_anomaly: enrichedCount } },
    };
  }
}
