/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  EndpointAsset,
  ListAssetsRequest,
  ListAssetsResponse,
  PostureSummaryResponse,
  PrivilegesSummaryResponse,
  DriftSummaryResponse,
  TransformStatusResponse,
  PostureLevel,
} from '../../../common/endpoint_assets';
import {
  ENDPOINT_ASSETS_INDEX_PATTERN,
  POSTURE_SCORE_THRESHOLDS,
  POSTURE_LEVELS,
  ENTITY_FIELDS,
  ASSET_FIELDS,
  ENDPOINT_FIELDS,
} from '../../../common/endpoint_assets';
import {
  getAssetFactsTransformId,
  getAssetFactsTransformConfig,
  getAssetIndexMapping,
  getAssetIngestPipeline,
  getAssetIngestPipelineId,
} from './transforms';
import {
  createTransform,
  stopTransform,
  deleteTransform,
  scheduleTransformNow,
} from '../entity_analytics/utils/transforms';

export interface EndpointAssetsServiceOptions {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  namespace: string;
}

/**
 * Service for managing Endpoint Asset Visibility & Security Posture.
 *
 * Handles:
 * - Asset listing and retrieval
 * - Transform management
 * - Posture score calculation
 * - Summary aggregations
 *
 * Schema is designed to be compatible with Entity Store for future integration.
 * @see /Users/tomaszciecierski/Projects/elastic/kibana/.claude/plans/asset-management/schema-alignment-entity-store.md
 */
export class EndpointAssetsService {
  private readonly esClient: ElasticsearchClient;
  private readonly soClient: SavedObjectsClientContract;
  private readonly logger: Logger;
  private readonly namespace: string;
  private readonly indexPattern: string;
  private readonly transformId: string;

  constructor(options: EndpointAssetsServiceOptions) {
    this.esClient = options.esClient;
    this.soClient = options.soClient;
    this.logger = options.logger;
    this.namespace = options.namespace;
    this.indexPattern = ENDPOINT_ASSETS_INDEX_PATTERN.replace('*', this.namespace);
    this.transformId = getAssetFactsTransformId(this.namespace);
  }

  // ===========================================================================
  // Asset Retrieval
  // ===========================================================================

  async listAssets(request: ListAssetsRequest): Promise<ListAssetsResponse> {
    const {
      page = 1,
      per_page = 25,
      sort_field = ENDPOINT_FIELDS.LAST_SEEN,
      sort_direction = 'desc',
      platform,
      posture_level,
      search,
    } = request;

    const must: Array<Record<string, unknown>> = [];

    // Filter by platform (Asset Inventory compatible field)
    if (platform) {
      must.push({ term: { [ASSET_FIELDS.PLATFORM]: platform } });
    }

    // Filter by posture level (Endpoint-specific field)
    if (posture_level) {
      must.push({ term: { [ENDPOINT_FIELDS.POSTURE_LEVEL]: posture_level } });
    }

    // Search across entity and host fields
    if (search) {
      must.push({
        multi_match: {
          query: search,
          fields: [
            `${ENTITY_FIELDS.NAME}^3`,
            ENTITY_FIELDS.ID,
            'host.os.name',
          ],
        },
      });
    }

    const response = await this.esClient.search<EndpointAsset>({
      index: this.indexPattern,
      from: (page - 1) * per_page,
      size: per_page,
      sort: [{ [sort_field]: sort_direction }],
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      assets: response.hits.hits.map((hit) => hit._source as EndpointAsset),
      total,
      page,
      per_page,
    };
  }

  async getAsset(assetId: string): Promise<EndpointAsset | null> {
    const response = await this.esClient.search<EndpointAsset>({
      index: this.indexPattern,
      query: { term: { [ENTITY_FIELDS.ID]: assetId } },
      size: 1,
    });

    if (response.hits.hits.length === 0) {
      return null;
    }

    return response.hits.hits[0]._source as EndpointAsset;
  }

  // ===========================================================================
  // Summaries / Aggregations
  // ===========================================================================

  async getPostureSummary(): Promise<PostureSummaryResponse> {
    const response = await this.esClient.search({
      index: this.indexPattern,
      size: 0,
      aggs: {
        total_assets: { value_count: { field: ENTITY_FIELDS.ID } },
        avg_score: { avg: { field: ENDPOINT_FIELDS.POSTURE_SCORE } },
        score_distribution: {
          range: {
            field: ENDPOINT_FIELDS.POSTURE_SCORE,
            ranges: [
              { key: 'critical', from: 0, to: POSTURE_SCORE_THRESHOLDS.CRITICAL },
              {
                key: 'high',
                from: POSTURE_SCORE_THRESHOLDS.CRITICAL,
                to: POSTURE_SCORE_THRESHOLDS.HIGH,
              },
              {
                key: 'medium',
                from: POSTURE_SCORE_THRESHOLDS.HIGH,
                to: POSTURE_SCORE_THRESHOLDS.MEDIUM,
              },
              {
                key: 'low',
                from: POSTURE_SCORE_THRESHOLDS.MEDIUM,
                to: POSTURE_SCORE_THRESHOLDS.LOW + 1,
              },
            ],
          },
        },
        failed_checks: {
          terms: { field: ENDPOINT_FIELDS.FAILED_CHECKS, size: 20 },
        },
      },
    });

    const aggs = response.aggregations as Record<string, unknown>;

    // Extract score distribution
    const scoreDistribution = (
      aggs.score_distribution as { buckets: Array<{ key: string; doc_count: number }> }
    )?.buckets || [];
    const distribution: Record<string, number> = {};
    for (const bucket of scoreDistribution) {
      distribution[bucket.key] = bucket.doc_count;
    }

    // Extract failed checks
    const failedChecksBuckets = (
      aggs.failed_checks as { buckets: Array<{ key: string; doc_count: number }> }
    )?.buckets || [];
    const failedChecksByType: Record<string, number> = {};
    for (const bucket of failedChecksBuckets) {
      failedChecksByType[bucket.key] = bucket.doc_count;
    }

    return {
      total_assets: (aggs.total_assets as { value: number })?.value || 0,
      posture_distribution: {
        critical: distribution.critical || 0,
        high: distribution.high || 0,
        medium: distribution.medium || 0,
        low: distribution.low || 0,
      },
      failed_checks_by_type: failedChecksByType,
      average_score: Math.round((aggs.avg_score as { value: number })?.value || 0),
    };
  }

  async getPrivilegesSummary(): Promise<PrivilegesSummaryResponse> {
    const response = await this.esClient.search({
      index: this.indexPattern,
      size: 0,
      aggs: {
        total_assets: { value_count: { field: ENTITY_FIELDS.ID } },
        elevated_privileges: {
          filter: { term: { [ENDPOINT_FIELDS.ELEVATED_RISK]: true } },
        },
        total_admins: { sum: { field: ENDPOINT_FIELDS.ADMIN_COUNT } },
        avg_admin_count: { avg: { field: ENDPOINT_FIELDS.ADMIN_COUNT } },
      },
    });

    const aggs = response.aggregations as Record<string, unknown>;

    return {
      total_assets: (aggs.total_assets as { value: number })?.value || 0,
      assets_with_elevated_privileges:
        (aggs.elevated_privileges as { doc_count: number })?.doc_count || 0,
      total_local_admins: (aggs.total_admins as { value: number })?.value || 0,
      average_admin_count: Math.round(
        (aggs.avg_admin_count as { value: number })?.value || 0
      ),
    };
  }

  async getDriftSummary(): Promise<DriftSummaryResponse> {
    const response = await this.esClient.search({
      index: this.indexPattern,
      size: 0,
      aggs: {
        total_assets: { value_count: { field: ENTITY_FIELDS.ID } },
        recently_changed: {
          filter: { term: { [ENDPOINT_FIELDS.RECENTLY_CHANGED]: true } },
        },
        change_types: {
          terms: { field: ENDPOINT_FIELDS.CHANGE_TYPES, size: 20 },
        },
      },
    });

    const aggs = response.aggregations as Record<string, unknown>;

    // Extract change types
    const changeTypesBuckets = (
      aggs.change_types as { buckets: Array<{ key: string; doc_count: number }> }
    )?.buckets || [];
    const changeTypesDistribution: Record<string, number> = {};
    for (const bucket of changeTypesBuckets) {
      changeTypesDistribution[bucket.key] = bucket.doc_count;
    }

    return {
      total_assets: (aggs.total_assets as { value: number })?.value || 0,
      recently_changed_assets:
        (aggs.recently_changed as { doc_count: number })?.doc_count || 0,
      change_types_distribution: changeTypesDistribution,
    };
  }

  // ===========================================================================
  // Transform Management
  // ===========================================================================

  async initializeTransform(): Promise<void> {
    this.logger.info(`Initializing endpoint assets transform: ${this.transformId}`);

    // Note: We don't create the index manually because the destination index pattern
    // logs-osquery_manager.endpoint_assets-* matches a data stream template.
    // The index will be created automatically when the transform writes data.

    // 1. Create ingest pipeline first (required for transform to use it)
    const pipelineId = getAssetIngestPipelineId(this.namespace);
    const pipelineConfig = getAssetIngestPipeline(this.namespace);
    this.logger.info(`Creating ingest pipeline: ${pipelineId}`);

    await this.esClient.ingest.putPipeline({
      id: pipelineId,
      description: pipelineConfig.description,
      processors: pipelineConfig.processors,
    });

    this.logger.info(`Ingest pipeline ${pipelineId} created successfully`);

    // 2. Create transform
    const transformConfig = getAssetFactsTransformConfig(this.namespace);
    await createTransform({
      esClient: this.esClient,
      transform: transformConfig,
      logger: this.logger,
    });

    this.logger.info(`Transform ${this.transformId} created successfully`);
  }

  async startTransform(): Promise<void> {
    this.logger.info(`Starting transform: ${this.transformId}`);
    await this.esClient.transform.startTransform({
      transform_id: this.transformId,
    });
  }

  async stopTransformService(): Promise<void> {
    this.logger.info(`Stopping transform: ${this.transformId}`);
    await stopTransform({
      esClient: this.esClient,
      logger: this.logger,
      transformId: this.transformId,
    });
  }

  async deleteTransformService(): Promise<void> {
    this.logger.info(`Deleting transform: ${this.transformId}`);
    await deleteTransform({
      esClient: this.esClient,
      logger: this.logger,
      transformId: this.transformId,
      deleteData: false, // Keep the data
    });
  }

  async scheduleTransformNow(): Promise<void> {
    this.logger.info(`Scheduling immediate transform execution: ${this.transformId}`);
    await scheduleTransformNow({
      esClient: this.esClient,
      transformId: this.transformId,
    });
  }

  async migrateTransform(): Promise<void> {
    this.logger.info('Starting CAASM transform migration to v7.0.0 (state-centric model)');

    try {
      // 1. Stop existing transform
      this.logger.info('Step 1/5: Stopping existing transform');
      await this.stopTransformService().catch((error) => {
        this.logger.warn(`Transform stop failed (may not exist): ${error.message}`);
      });

      // 2. Delete old transform (keep data)
      this.logger.info('Step 2/5: Deleting old transform configuration');
      await this.deleteTransformService().catch((error) => {
        this.logger.warn(`Transform delete failed (may not exist): ${error.message}`);
      });

      // 3. Create new transform with updated config
      this.logger.info('Step 3/5: Creating new transform with v7.0.0 configuration');
      await this.initializeTransform();

      // 4. Start new transform
      this.logger.info('Step 4/5: Starting new transform');
      await this.startTransform();

      // 5. Verify transform is running
      this.logger.info('Step 5/5: Verifying transform status');
      const status = await this.getTransformStatus();
      if (status.status === 'started' || status.status === 'indexing') {
        this.logger.info(
          `CAASM transform migration completed successfully. Transform is ${status.status}`
        );
      } else {
        this.logger.warn(
          `CAASM transform migration completed but transform status is: ${status.status}`
        );
      }
    } catch (error) {
      this.logger.error(`CAASM transform migration failed: ${error.message}`);
      throw error;
    }
  }

  async getTransformStatus(): Promise<TransformStatusResponse> {
    try {
      const response = await this.esClient.transform.getTransformStats({
        transform_id: this.transformId,
      });

      if (response.count === 0) {
        return {
          transform_id: this.transformId,
          status: 'not_found',
        };
      }

      const stats = response.transforms[0];
      return {
        transform_id: this.transformId,
        status: stats.state as TransformStatusResponse['status'],
        documents_processed: stats.stats.documents_processed,
        last_checkpoint: stats.checkpointing?.last?.timestamp,
      };
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return {
          transform_id: this.transformId,
          status: 'not_found',
        };
      }
      throw error;
    }
  }

  // ===========================================================================
  // Posture Calculation
  // ===========================================================================

  /**
   * Calculate posture score for an asset.
   *
   * This is a simple deduction-based score:
   * - Start with 100 points
   * - Deduct points for each failed security check
   * - Map final score to a risk level
   */
  calculatePostureScore(asset: Partial<EndpointAsset>): {
    score: number;
    level: PostureLevel;
    reasons: string[];
  } {
    let score = 100;
    const reasons: string[] = [];

    const posture = asset.endpoint?.posture;
    const privileges = asset.endpoint?.privileges;
    const agent = asset.agent;

    // Check disk encryption
    if (posture?.disk_encryption === 'FAIL') {
      score -= 25;
      reasons.push('Disk encryption disabled');
    }

    // Check firewall
    if (posture?.firewall_enabled === false) {
      score -= 20;
      reasons.push('Firewall disabled');
    }

    // Check secure boot
    if (posture?.secure_boot === false) {
      score -= 15;
      reasons.push('Secure boot disabled');
    }

    // Check admin count
    if (privileges && privileges.admin_count > 2) {
      score -= 10;
      reasons.push(`Excessive local admins (${privileges.admin_count})`);
    }

    // Check agent status
    if (agent?.type && agent.type !== 'elastic-agent') {
      score -= 20;
      reasons.push('Elastic Agent not running');
    }

    // Determine posture level based on score
    let level: PostureLevel;
    if (score <= POSTURE_SCORE_THRESHOLDS.CRITICAL) {
      level = POSTURE_LEVELS.CRITICAL;
    } else if (score <= POSTURE_SCORE_THRESHOLDS.HIGH) {
      level = POSTURE_LEVELS.HIGH;
    } else if (score <= POSTURE_SCORE_THRESHOLDS.MEDIUM) {
      level = POSTURE_LEVELS.MEDIUM;
    } else {
      level = POSTURE_LEVELS.LOW;
    }

    return { score: Math.max(0, score), level, reasons };
  }
}

/**
 * Factory function for creating EndpointAssetsService
 */
export const createEndpointAssetsService = (
  options: EndpointAssetsServiceOptions
): EndpointAssetsService => {
  return new EndpointAssetsService(options);
};
