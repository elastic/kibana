/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  DEFAULT_INFERENCE_ENDPOINT_ID,
  DEFAULT_BATCH_SIZE,
  type AlertVectorDocument,
  type VectorizationResult,
  type BatchVectorizationResult,
} from '../types';
import { extractAlertFeatures, composeFeatureText, hashFeatureText } from '../feature_extraction';
import type { AlertVectorIndexService } from '../vector_storage';

export interface AlertEmbeddingServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  vectorIndexService: AlertVectorIndexService;
  inferenceEndpointId?: string;
}

export const createAlertEmbeddingService = ({
  esClient,
  logger,
  vectorIndexService,
  inferenceEndpointId = DEFAULT_INFERENCE_ENDPOINT_ID,
}: AlertEmbeddingServiceDeps) => {
  const resolvedEndpointId = inferenceEndpointId;

  const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const response = await esClient.inference.inference({
        inference_id: resolvedEndpointId,
        task_type: 'text_embedding',
        input: text,
      });

      const embeddingResult = response as unknown as {
        text_embedding?: { embedding: number[] };
        text_embedding_bytes?: { embedding: number[] };
      };

      const embedding =
        embeddingResult.text_embedding?.embedding ??
        embeddingResult.text_embedding_bytes?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error(
          `Inference endpoint ${resolvedEndpointId} returned unexpected response format`
        );
      }

      return embedding;
    } catch (error) {
      logger.error(
        `Failed to generate embedding via inference endpoint ${resolvedEndpointId}: ${error.message}`
      );
      throw error;
    }
  };

  const vectorizeAlert = async (
    alertId: string,
    alertIndex: string,
    alertDoc: Record<string, unknown>
  ): Promise<VectorizationResult> => {
    try {
      const features = extractAlertFeatures(alertDoc);
      const featureText = composeFeatureText(features);
      const featureHash = hashFeatureText(featureText);

      const existing = await vectorIndexService.findByAlertId(alertId);
      if (existing && existing.feature_text_hash === featureHash) {
        return {
          alertId,
          success: true,
          vectorDocumentId: alertId,
        };
      }

      const vector = await generateEmbedding(featureText);

      const vectorDoc: AlertVectorDocument = {
        alert_id: alertId,
        alert_index: alertIndex,
        vector,
        feature_text_hash: featureHash,
        inference_endpoint_id: resolvedEndpointId,
        feature_text: featureText,
        '@timestamp': new Date().toISOString(),
      };

      const docId = await vectorIndexService.storeVectorDocument(vectorDoc);

      return {
        alertId,
        success: true,
        vectorDocumentId: docId,
      };
    } catch (error) {
      logger.error(`Failed to vectorize alert ${alertId}: ${error.message}`);
      return {
        alertId,
        success: false,
        error: error.message,
      };
    }
  };

  const batchVectorize = async (
    alerts: Array<{ id: string; index: string; doc: Record<string, unknown> }>,
    batchSize: number = DEFAULT_BATCH_SIZE
  ): Promise<BatchVectorizationResult> => {
    const results: VectorizationResult[] = [];

    for (let i = 0; i < alerts.length; i += batchSize) {
      const batch = alerts.slice(i, i + batchSize);
      logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          alerts.length / batchSize
        )} (${batch.length} alerts)`
      );

      const batchResults = await Promise.allSettled(
        batch.map((alert) => vectorizeAlert(alert.id, alert.index, alert.doc))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            alertId: 'unknown',
            success: false,
            error: result.reason?.message ?? 'Unknown error',
          });
        }
      }
    }

    const succeeded = results.filter((r) => r.success).length;

    return {
      total: alerts.length,
      succeeded,
      failed: alerts.length - succeeded,
      results,
    };
  };

  return {
    generateEmbedding,
    vectorizeAlert,
    batchVectorize,
    getInferenceEndpointId: () => resolvedEndpointId,
  };
};

export type AlertEmbeddingService = ReturnType<typeof createAlertEmbeddingService>;
