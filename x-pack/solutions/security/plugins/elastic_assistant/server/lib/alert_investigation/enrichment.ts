/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ExtractedEntity, PipelineConfig } from './types';

/**
 * An enrichment strategy augments extracted entities with additional context
 * before case matching. Implementations can query threat intelligence feeds,
 * ML anomaly detectors, or other external data sources.
 */
export interface EnrichmentStrategy {
  readonly id: string;
  readonly name: string;

  /**
   * Enrich a batch of entities. Returns the same entities with optional
   * metadata additions (e.g., threat intel match, anomaly score).
   */
  enrich(params: {
    entities: ExtractedEntity[];
    config: PipelineConfig;
    logger: Logger;
  }): Promise<EnrichmentResult>;
}

export interface EnrichedEntity extends ExtractedEntity {
  readonly enrichments?: EntityEnrichment[];
}

export interface EntityEnrichment {
  readonly source: string;
  readonly type: 'threat_intel' | 'ml_anomaly' | 'mitre_attack' | 'reputation' | 'custom';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly details: Record<string, unknown>;
  readonly timestamp: string;
}

export interface EnrichmentResult {
  readonly enrichedEntities: EnrichedEntity[];
  readonly stats: {
    readonly totalEnriched: number;
    readonly bySource: Record<string, number>;
  };
}

/**
 * Registry for managing enrichment strategies. Strategies are executed
 * in registration order; each receives the output of the previous.
 */
export class EnrichmentRegistry {
  private readonly strategies: EnrichmentStrategy[] = [];

  register(strategy: EnrichmentStrategy): void {
    this.strategies.push(strategy);
  }

  async runAll(params: {
    entities: ExtractedEntity[];
    config: PipelineConfig;
    logger: Logger;
  }): Promise<EnrichmentResult> {
    let current: EnrichedEntity[] = params.entities.map((e) => ({ ...e }));
    const statsBySource: Record<string, number> = {};
    let totalEnriched = 0;

    for (const strategy of this.strategies) {
      try {
        const result = await strategy.enrich({ ...params, entities: current });
        current = result.enrichedEntities;
        totalEnriched += result.stats.totalEnriched;
        for (const [source, count] of Object.entries(result.stats.bySource)) {
          statsBySource[source] = (statsBySource[source] ?? 0) + count;
        }
      } catch (error) {
        params.logger.warn(
          `Enrichment strategy '${strategy.id}' failed: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }

    return {
      enrichedEntities: current,
      stats: { totalEnriched, bySource: statsBySource },
    };
  }
}
