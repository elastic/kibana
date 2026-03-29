/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { refreshCatalog, CatalogQuery, type PackageClientLike } from '@kbn/data-source-catalog';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getSecurityPatterns } from './security_catalog_filters';

const CATALOG_REFRESH_TASK_TYPE = 'security:data-source-catalog:refresh-stats';
const CATALOG_REFRESH_TASK_ID = 'security:data-source-catalog:refresh-stats:1.0.0';
const DEFAULT_REFRESH_INTERVAL = '6h';

interface StartParams {
  esClient: ElasticsearchClient;
  packageClient?: PackageClientLike;
  configPatterns?: string[];
  refreshInterval?: string;
}

export class SecurityCatalogService {
  private patterns: string[] = [];
  private esClient?: ElasticsearchClient;
  private packageClient?: PackageClientLike;
  private refreshInterval = DEFAULT_REFRESH_INTERVAL;

  constructor(private readonly logger: Logger) {}

  setup(taskManager: TaskManagerSetupContract): void {
    taskManager.registerTaskDefinitions({
      [CATALOG_REFRESH_TASK_TYPE]: {
        title: 'Security Data Source Catalog Stats Refresh',
        timeout: '5m',
        createTaskRunner: () => ({
          run: async () => {
            if (this.esClient) {
              await this.refresh(this.esClient, this.packageClient);
            }
            return { state: {} };
          },
          cancel: async () => {},
        }),
      },
    });
  }

  async scheduleRefresh(taskManager: TaskManagerStartContract): Promise<void> {
    try {
      await taskManager.ensureScheduled({
        id: CATALOG_REFRESH_TASK_ID,
        taskType: CATALOG_REFRESH_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: { interval: this.refreshInterval },
        state: {},
        params: {},
      });
      this.logger.debug('Data source catalog refresh task scheduled');
    } catch (error) {
      this.logger.error(`Failed to schedule catalog refresh: ${error}`);
    }
  }

  async start({ esClient, packageClient, configPatterns, refreshInterval }: StartParams): Promise<void> {
    this.patterns = getSecurityPatterns(configPatterns);
    this.esClient = esClient;
    this.packageClient = packageClient;
    if (refreshInterval) {
      this.refreshInterval = refreshInterval;
    }

    try {
      const result = await refreshCatalog({
        esClient,
        packageClient,
        patterns: this.patterns,
        includeStats: true,
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
        includeStats: true,
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
