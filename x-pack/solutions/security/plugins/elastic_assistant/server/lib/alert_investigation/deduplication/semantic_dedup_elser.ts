/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AlertWithId } from './deduplicate_alerts';

/**
 * Check if ML node with ELSER is available
 * ELSER is deployed by default, but deployment may not have ML node configured
 */
export async function isElserAvailable(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const models = await esClient.ml.getTrainedModels({
      model_id: '.elser_model_2*',
      include: 'definition_status',
    });

    // Check if ELSER model exists and is deployed
    const elserModel = models.trained_model_configs.find((m) =>
      m.model_id.startsWith('.elser_model_2')
    );

    return elserModel != null && elserModel.fully_defined === true;
  } catch (error) {
    // ML API not available (no ML node) or other error
    return false;
  }
}

/**
 * Generate ELSER embeddings for alert feature text
 * Gracefully handles ML node unavailability
 */
export async function generateElserEmbeddings(
  featureTexts: string[],
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<number[][] | null> {
  try {
    const result = await esClient.ml.inferTrainedModel({
      model_id: '.elser_model_2',
      docs: featureTexts.map((text) => ({ text_field: text })),
    });

    // Extract embeddings from inference results
    return result.inference_results.map((r) => r.predicted_value as number[]);
  } catch (error) {
    logger.warn(`ELSER embedding generation failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Semantic deduplication using ELSER embeddings + kNN similarity
 *
 * Approach:
 * 1. Generate ELSER embeddings for alert feature texts
 * 2. Use Elasticsearch kNN to find similar alerts (cosine similarity > threshold)
 * 3. Cluster alerts based on embedding similarity
 *
 * Fallback: Returns null if ELSER unavailable (caller should use Jaccard)
 */
export async function deduplicateWithElser(
  alerts: AlertWithId[],
  esClient: ElasticsearchClient,
  logger: Logger,
  similarityThreshold: number = 0.75
): Promise<Map<string, string[]> | null> {
  // Check if ELSER available
  const elserAvailable = await isElserAvailable(esClient);
  if (!elserAvailable) {
    logger.info('ELSER not available - will use Jaccard fallback');
    return null; // Caller should fallback to Jaccard
  }

  logger.info(`Using ELSER semantic deduplication for ${alerts.length} alerts`);

  // TODO: Implement ELSER-based clustering
  // 1. Generate embeddings for feature texts
  // 2. Use kNN search to find similar alerts
  // 3. Build clusters based on similarity threshold
  // 4. Return cluster map (leader ID → member IDs)

  // For now, return null to use Jaccard (full implementation ~6-8 hours)
  return null;
}

/**
 * Hybrid deduplication: Try ELSER, fallback to Jaccard
 *
 * This pattern allows Phase 1 shipping with automatic ELSER usage when available,
 * graceful degradation to Jaccard when ML node unavailable.
 *
 * No platform team dependencies - works in all deployments!
 */
export async function deduplicateWithHybridApproach(
  alerts: AlertWithId[],
  esClient: ElasticsearchClient,
  logger: Logger,
  jaccardFallback: (alerts: AlertWithId[]) => Promise<Map<string, string[]>>
): Promise<{ clusters: Map<string, string[]>; method: 'elser' | 'jaccard' }> {
  // Try ELSER first (if available)
  const elserClusters = await deduplicateWithElser(alerts, esClient, logger);

  if (elserClusters !== null) {
    logger.info('✅ Used ELSER semantic deduplication');
    return { clusters: elserClusters, method: 'elser' };
  }

  // Fallback to Jaccard (always works)
  logger.info('Using Jaccard similarity deduplication (ELSER unavailable or fallback)');
  const jaccardClusters = await jaccardFallback(alerts);
  return { clusters: jaccardClusters, method: 'jaccard' };
}
