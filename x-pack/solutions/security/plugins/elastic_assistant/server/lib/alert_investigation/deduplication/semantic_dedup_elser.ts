/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AlertWithId } from '../utils';
import { extractAlertFeatures, composeFeatureText } from './feature_extraction';

/**
 * ELSER Semantic Deduplication
 *
 * Uses ELSER sparse vector embeddings for semantic alert similarity.
 * Instead of converting to dense vectors (which hits the 4096 dim limit),
 * this uses text_expansion queries on a sparse_vector field.
 *
 * Fallback: Returns null if ELSER unavailable → caller uses Jaccard.
 */

const ELSER_TEMP_INDEX_PREFIX = '.temp-alert-elser-dedup';

/**
 * Check if ELSER v2 model is available and deployed
 */
export async function isElserAvailable(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const models = await esClient.ml.getTrainedModels({
      model_id: '.elser_model_2*',
      include: 'definition_status',
    });

    const elserModel = models.trained_model_configs.find((m) =>
      m.model_id.startsWith('.elser_model_2')
    );

    if (!elserModel?.fully_defined) return false;

    // Verify actually deployed
    const stats = await esClient.ml.getTrainedModelsStats({
      model_id: elserModel.model_id,
    });

    const modelStats = stats.trained_model_stats.find(
      (s) => s.model_id === elserModel.model_id
    );

    const state = modelStats?.deployment_stats?.state;
    return state === 'started' || state === 'fully_allocated';
  } catch {
    return false;
  }
}

/**
 * Hybrid dedup: try ELSER semantic similarity, fall back to null (Jaccard).
 *
 * Uses sparse_vector field + text_expansion query — no dense vector
 * conversion, no dimension limit issues.
 */
export async function deduplicateWithHybridApproach(
  alerts: AlertWithId[],
  esClient: ElasticsearchClient,
  similarityThreshold: number,
  logger: Logger
): Promise<Map<string, string[]> | null> {
  if (alerts.length < 2) return null;

  // Check ELSER availability
  const elserReady = await isElserAvailable(esClient);
  if (!elserReady) {
    logger.info('ELSER not available, skipping semantic dedup');
    return null;
  }

  const indexName = `${ELSER_TEMP_INDEX_PREFIX}-${Date.now()}`;

  try {
    // Create temp index with ELSER ingest pipeline + sparse_vector field
    await esClient.indices.create({
      index: indexName,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        'index.hidden': true,
        'index.default_pipeline': `${indexName}-pipeline`,
      },
      mappings: {
        properties: {
          alert_id: { type: 'keyword' },
          feature_text: { type: 'text' },
          ml: {
            properties: {
              tokens: { type: 'sparse_vector' },
            },
          },
        },
      },
    });

    // Create ingest pipeline for ELSER
    await esClient.ingest.putPipeline({
      id: `${indexName}-pipeline`,
      processors: [
        {
          inference: {
            model_id: '.elser_model_2',
            input_output: [
              {
                input_field: 'feature_text',
                output_field: 'ml.tokens',
              },
            ],
          },
        },
      ],
    });

    // Index alert feature texts (ELSER pipeline generates embeddings)
    const featureTexts = alerts.map((alert) => ({
      alertId: alert._id,
      text: composeFeatureText(extractAlertFeatures(alert._source)),
    }));

    const bulkOps = featureTexts.flatMap((ft) => [
      { index: { _index: indexName } },
      { alert_id: ft.alertId, feature_text: ft.text },
    ]);

    await esClient.bulk({ operations: bulkOps, refresh: 'wait_for' });

    logger.info(`Indexed ${alerts.length} alerts with ELSER embeddings for semantic dedup`);

    // Find similar pairs using text_expansion queries
    const similarityGraph = new Map<string, string[]>();

    for (const ft of featureTexts) {
      const result = await esClient.search({
        index: indexName,
        query: {
          text_expansion: {
            'ml.tokens': {
              model_id: '.elser_model_2',
              model_text: ft.text,
            },
          },
        },
        size: 20,
        _source: ['alert_id'],
      });

      const similar: string[] = [];
      for (const hit of result.hits.hits) {
        const hitId = (hit._source as { alert_id: string }).alert_id;
        const score = hit._score ?? 0;
        if (hitId !== ft.alertId && score >= similarityThreshold) {
          similar.push(hitId);
        }
      }

      if (similar.length > 0) {
        similarityGraph.set(ft.alertId, similar);
      }
    }

    // Build clusters from similarity graph using Union-Find
    const clusters = buildClustersFromSimilarityGraph(alerts, similarityGraph);

    logger.info(
      `ELSER semantic dedup: ${alerts.length} alerts → ${clusters.size} clusters`
    );

    return clusters;
  } catch (error) {
    logger.warn(
      `ELSER deduplication failed: ${error instanceof Error ? error.message : error}`
    );
    return null;
  } finally {
    // Cleanup temp index and pipeline
    try {
      await esClient.indices.delete({ index: indexName }).catch(() => {});
      await esClient.ingest.deletePipeline({ id: `${indexName}-pipeline` }).catch(() => {});
    } catch {
      // Best effort cleanup
    }
  }
}

/**
 * Build clusters from similarity graph using Union-Find
 */
function buildClustersFromSimilarityGraph(
  alerts: AlertWithId[],
  similarityGraph: Map<string, string[]>
): Map<string, string[]> {
  const parent = new Map<string, string>();

  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let current = x;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };

  const unite = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  // Initialize all alerts
  for (const alert of alerts) find(alert._id);

  // Unite similar alerts
  for (const [alertId, similarIds] of similarityGraph) {
    for (const simId of similarIds) unite(alertId, simId);
  }

  // Build cluster map
  const clusters = new Map<string, string[]>();
  for (const alert of alerts) {
    const root = find(alert._id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(alert._id);
  }

  return clusters;
}
