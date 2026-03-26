/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { refreshCatalog, CatalogQuery, type PackageClientLike } from '@kbn/data-source-catalog';
import { getSecurityPatterns } from './security_catalog_filters';

interface StartParams {
  esClient: ElasticsearchClient;
  packageClient?: PackageClientLike;
  configPatterns?: string[];
}

export class SecurityCatalogService {
  private patterns: string[] = [];

  constructor(private readonly logger: Logger) {}

  async start({ esClient, packageClient, configPatterns }: StartParams): Promise<void> {
    this.patterns = getSecurityPatterns(configPatterns);

    try {
      const result = await refreshCatalog({
        esClient,
        packageClient,
        patterns: this.patterns,
      });
      this.logger.info(
        `Data source catalog initialized: ${result.entriesCount} entries in ${result.durationMs}ms`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize data source catalog: ${error}`);
    }
  }

  async refresh(esClient: ElasticsearchClient, packageClient?: PackageClientLike): Promise<void> {
    try {
      const result = await refreshCatalog({
        esClient,
        packageClient,
        patterns: this.patterns,
      });
      this.logger.debug(
        `Data source catalog refreshed: ${result.entriesCount} entries in ${result.durationMs}ms`
      );
    } catch (error) {
      this.logger.error(`Failed to refresh data source catalog: ${error}`);
    }
  }

  getQuery(esClient: ElasticsearchClient): CatalogQuery {
    return new CatalogQuery(esClient);
  }
}
