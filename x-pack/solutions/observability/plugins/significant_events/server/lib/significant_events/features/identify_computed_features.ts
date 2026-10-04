/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Streams } from '@kbn/streams-schema';
import { type FeatureUpsert } from '@kbn/significant-events-schema';
import { generateAllComputedFeatures } from '@kbn/nightshift-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { streamToAnalysisTarget } from '../stream_to_analysis_target';
import { reconcileComputedFeatures } from './reconcile_features';

export interface IdentifyComputedFeaturesOptions {
  stream: Streams.all.Definition;
  streamName: string;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
  runId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface IdentifyComputedFeaturesResult {
  features: FeatureUpsert[];
  errors: Array<{ feature: string; error: string }>;
}

export async function identifyComputedFeatures({
  stream,
  streamName,
  start,
  end,
  esClient,
  kiClient,
  logger,
  runId,
  signal,
  timeoutMs,
}: IdentifyComputedFeaturesOptions): Promise<IdentifyComputedFeaturesResult> {
  const { features: computedFeatures, errors } = await generateAllComputedFeatures({
    target: streamToAnalysisTarget(stream),
    start,
    end,
    esClient,
    logger: logger.get('computed_features'),
    requestSignal: signal,
    timeoutMs,
  });

  const reconciledComputedFeatures = reconcileComputedFeatures({
    computedFeatures,
    streamName,
    runId,
  });

  if (reconciledComputedFeatures.length > 0) {
    const expiresAt = kiClient.getDefaultExpiresAt();
    await kiClient.bulk(
      streamName,
      reconciledComputedFeatures.map((feature) => ({
        index: { feature: { ...feature, expires_at: expiresAt } },
      }))
    );
  }

  return { features: reconciledComputedFeatures, errors };
}
