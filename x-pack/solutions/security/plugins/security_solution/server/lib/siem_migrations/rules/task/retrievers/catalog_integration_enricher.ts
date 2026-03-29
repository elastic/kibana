/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CatalogQuery } from '@kbn/data-source-catalog';
import type { RuleMigrationIntegration } from '../../types';

/**
 * Enriches SIEM migration integration matches with data source catalog metadata.
 * Provides field lists, freshness indicators, and ECS coverage that the ELSER
 * semantic search doesn't capture.
 */
export class CatalogIntegrationEnricher {
  private readonly catalogQuery: CatalogQuery;

  constructor(esClient: ElasticsearchClient) {
    this.catalogQuery = new CatalogQuery(esClient);
  }

  /**
   * Enriches integration matches with catalog data about their actual data streams.
   * Returns an enrichment context string that can be appended to the LLM prompt.
   */
  async enrichIntegrations(integrations: RuleMigrationIntegration[]): Promise<string> {
    if (integrations.length === 0) {
      return '';
    }

    const enrichments: string[] = [];

    for (const integration of integrations) {
      const packageName = integration.id;

      try {
        const catalogResult = await this.catalogQuery.search({
          integrationPackage: packageName,
          size: 5,
        });

        if (catalogResult.entries.length > 0) {
          const lines = [
            `Integration "${integration.title}" has ${catalogResult.entries.length} active data streams:`,
          ];

          for (const entry of catalogResult.entries) {
            const parts = [`  - ${entry.name}`];
            if (entry.stats) {
              parts.push(
                `(${entry.stats.doc_count.toLocaleString()} docs, ${entry.stats.freshness_category})`
              );
            }
            parts.push(
              `— ${entry.mapping.ecs_field_count} ECS fields (${Math.round(entry.mapping.ecs_field_coverage * 100)}% coverage)`
            );

            if (entry.semantic?.topics && entry.semantic.topics.length > 0) {
              parts.push(`[topics: ${entry.semantic.topics.join(', ')}]`);
            }

            lines.push(parts.join(' '));
          }

          enrichments.push(lines.join('\n'));
        }
      } catch {
        // Catalog not available — graceful degradation
      }
    }

    if (enrichments.length === 0) {
      return '';
    }

    return `\n\nData source catalog context for matched integrations:\n${enrichments.join('\n\n')}`;
  }
}
