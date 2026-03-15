/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_MAX_RESULTS,
  type AlertVectorDocument,
  type SimilarAlert,
  type SimilaritySearchResult,
} from '../types';
import type { AlertVectorIndexService } from '../vector_storage';
import type { AlertEmbeddingService } from '../embedding';

export interface AlertSimilarityServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  vectorIndexService: AlertVectorIndexService;
  embeddingService: AlertEmbeddingService;
}

export const createAlertSimilarityService = ({
  esClient,
  logger,
  vectorIndexService,
  embeddingService,
}: AlertSimilarityServiceDeps) => {
  const searchByVector = async (
    queryVector: number[],
    options: {
      threshold?: number;
      maxResults?: number;
      excludeAlertIds?: string[];
    } = {}
  ): Promise<SimilarAlert[]> => {
    const {
      threshold = DEFAULT_SIMILARITY_THRESHOLD,
      maxResults = DEFAULT_MAX_RESULTS,
      excludeAlertIds = [],
    } = options;

    const indexName = vectorIndexService.getIndexName();

    const mustNot =
      excludeAlertIds.length > 0 ? [{ terms: { alert_id: excludeAlertIds } }] : undefined;

    const response = await esClient.search<AlertVectorDocument>({
      index: indexName,
      knn: {
        field: 'vector',
        query_vector: queryVector,
        k: maxResults,
        num_candidates: Math.max(maxResults * 10, 100),
        filter: mustNot ? { bool: { must_not: mustNot } } : undefined,
      },
      size: maxResults,
      _source: ['alert_id', 'alert_index', 'feature_text'],
    });

    return response.hits.hits
      .filter((hit): hit is typeof hit & { _score: number; _source: AlertVectorDocument } => {
        const score = hit._score ?? 0;
        return score >= threshold && hit._source != null;
      })
      .map((hit) => ({
        alertId: hit._source.alert_id,
        alertIndex: hit._source.alert_index,
        score: hit._score,
        featureText: hit._source.feature_text,
      }));
  };

  const searchByAlertId = async (
    alertId: string,
    options: {
      threshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<SimilaritySearchResult> => {
    const existingVector = await vectorIndexService.findByAlertId(alertId);

    if (!existingVector) {
      logger.warn(`No vector found for alert ${alertId}. Vectorize it first.`);
      return {
        query: { alertId },
        similarAlerts: [],
        total: 0,
        threshold: options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD,
      };
    }

    const similarAlerts = await searchByVector(existingVector.vector, {
      ...options,
      excludeAlertIds: [alertId],
    });

    return {
      query: { alertId },
      similarAlerts,
      total: similarAlerts.length,
      threshold: options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD,
    };
  };

  const searchByText = async (
    text: string,
    options: {
      threshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<SimilaritySearchResult> => {
    const queryVector = await embeddingService.generateEmbedding(text);

    const similarAlerts = await searchByVector(queryVector, options);

    return {
      query: { text },
      similarAlerts,
      total: similarAlerts.length,
      threshold: options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD,
    };
  };

  return {
    searchByAlertId,
    searchByText,
    searchByVector,
  };
};

export type AlertSimilarityService = ReturnType<typeof createAlertSimilarityService>;
