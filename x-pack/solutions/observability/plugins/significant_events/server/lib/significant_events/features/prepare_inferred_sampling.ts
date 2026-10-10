/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isComputedFeature, isFeatureWithFilter } from '@kbn/significant-events-schema';
import { compactInferenceDocuments, type InferenceDocument } from '@kbn/nightshift-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { fetchSampleDocuments } from './fetch_sample_documents';

export interface PrepareInferredSamplingResult {
  hasDocuments: boolean;
  documents: InferenceDocument[];
  docsCount: number;
  docIds: string[];
  samplingTelemetry: {
    totalFilters: number;
    filtersCapped: boolean;
    hasFilteredDocuments: boolean;
  };
}

export const prepareInferredSampling = async ({
  esClient,
  kiClient,
  streamName,
  samplingSource,
  start,
  end,
  runId,
  logger,
  sampleSize,
  entityFilteredRatio,
  diverseRatio,
  maxEntityFilters,
  iteration,
  samplingTimeoutMs,
}: {
  esClient: ElasticsearchClient;
  kiClient: Pick<KnowledgeIndicatorClient, 'getFeatures'>;
  streamName: string;
  samplingSource: string;
  start: number;
  end: number;
  runId: string;
  logger: Logger;
  sampleSize: number;
  entityFilteredRatio: number;
  diverseRatio: number;
  maxEntityFilters: number;
  iteration: number;
  samplingTimeoutMs: number;
}): Promise<PrepareInferredSamplingResult> => {
  const { hits: allFeatures } = await kiClient.getFeatures(streamName);
  const discoveredFeatures = allFeatures.filter(
    (feature) => !isComputedFeature(feature) && feature.run_id === runId
  );

  const {
    documents: sampledDocuments,
    totalFilters,
    filtersCapped,
    hasFilteredDocuments,
  } = await fetchSampleDocuments({
    esClient,
    index: samplingSource,
    start,
    end,
    features: discoveredFeatures.filter(isFeatureWithFilter),
    logger,
    size: sampleSize,
    entityFilteredRatio,
    diverseRatio,
    maxEntityFilters,
    iteration,
    samplingTimeoutMs,
  });
  const documents = compactInferenceDocuments(sampledDocuments);

  return {
    hasDocuments: documents.length > 0,
    documents,
    docsCount: documents.length,
    docIds: documents.map(({ _id }) => _id).filter((id): id is string => id !== undefined),
    samplingTelemetry: {
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
    },
  };
};
