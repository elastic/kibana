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
 * Enriches entities by querying Elastic Threat Intelligence indicators.
 * Looks up IPs, domains, file hashes, and URLs against the TI indicator index.
 */
export class ThreatIntelEnrichment implements EnrichmentStrategy {
  readonly id = 'threat_intel';
  readonly name = 'Threat Intelligence Enrichment';

  constructor(private readonly esClient: ElasticsearchClient) {}

  async enrich({
    entities,
    logger,
  }: {
    entities: ExtractedEntity[];
    config: PipelineConfig;
    logger: Logger;
  }): Promise<EnrichmentResult> {
    const lookupTypes = new Set(['ipv4', 'ipv6', 'domain', 'file_hash', 'url']);
    const lookupEntities = entities.filter((e) => lookupTypes.has(e.typeKey));

    if (lookupEntities.length === 0) {
      return {
        enrichedEntities: entities.map((e) => ({ ...e })),
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    const values = lookupEntities.map((e) => e.value);
    let matchedValues: Set<string>;

    try {
      const result = await this.esClient.search({
        index: 'logs-ti_*',
        size: 1000,
        query: {
          bool: {
            should: [
              { terms: { 'threat.indicator.ip': values } },
              { terms: { 'threat.indicator.url.full': values } },
              { terms: { 'threat.indicator.file.hash.sha256': values } },
              { terms: { 'threat.indicator.domain': values } },
            ],
            minimum_should_match: 1,
          },
        },
        _source: [
          'threat.indicator.ip',
          'threat.indicator.url.full',
          'threat.indicator.file.hash.sha256',
          'threat.indicator.domain',
        ],
      });

      matchedValues = new Set<string>();
      for (const hit of result.hits.hits) {
        const src = hit._source as Record<string, unknown> | undefined;
        if (src) {
          extractIndicatorValues(src, matchedValues);
        }
      }
    } catch (error) {
      logger.warn(`TI lookup failed: ${error instanceof Error ? error.message : error}`);
      return {
        enrichedEntities: entities.map((e) => ({ ...e })),
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    let enrichedCount = 0;
    const enrichedEntities: EnrichedEntity[] = entities.map((entity) => {
      if (matchedValues.has(entity.value.toLowerCase())) {
        enrichedCount++;
        return {
          ...entity,
          enrichments: [
            ...((entity as EnrichedEntity).enrichments ?? []),
            {
              source: 'threat_intel',
              type: 'threat_intel' as const,
              severity: 'high' as const,
              details: { matched: true, indicator_index: 'logs-ti_*' },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return { ...entity };
    });

    logger.info(`TI enrichment: ${enrichedCount}/${entities.length} entities matched indicators`);

    return {
      enrichedEntities,
      stats: { totalEnriched: enrichedCount, bySource: { threat_intel: enrichedCount } },
    };
  }
}

const extractIndicatorValues = (source: Record<string, unknown>, out: Set<string>): void => {
  const threat = source.threat as Record<string, unknown> | undefined;
  if (!threat) return;
  const indicator = threat.indicator as Record<string, unknown> | undefined;
  if (!indicator) return;

  if (typeof indicator.ip === 'string') out.add(indicator.ip.toLowerCase());
  if (typeof indicator.domain === 'string') out.add(indicator.domain.toLowerCase());

  const url = indicator.url as Record<string, unknown> | undefined;
  if (url && typeof url.full === 'string') out.add(url.full.toLowerCase());

  const file = indicator.file as Record<string, unknown> | undefined;
  if (file) {
    const hash = file.hash as Record<string, unknown> | undefined;
    if (hash && typeof hash.sha256 === 'string') out.add(hash.sha256.toLowerCase());
  }
};
