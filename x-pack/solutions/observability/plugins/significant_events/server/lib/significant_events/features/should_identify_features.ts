/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPUTED_FEATURE_TYPES, INFERRED_FEATURE_TYPES } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';

export interface ShouldIdentifyFeaturesResult {
  shouldIdentify: boolean;
}

export async function shouldIdentifyFeatures({
  kiClient,
  sourceId,
  thresholdHours,
}: {
  kiClient: KnowledgeIndicatorClient;
  sourceId: string;
  thresholdHours: number;
}): Promise<ShouldIdentifyFeaturesResult> {
  const inferred = await kiClient.getLatestRevisionTimestamp(sourceId, {
    types: [...INFERRED_FEATURE_TYPES],
  });

  if (!inferred) {
    return { shouldIdentify: true };
  }

  const computed = await kiClient.getLatestRevisionTimestamp(sourceId, {
    types: [...COMPUTED_FEATURE_TYPES],
  });

  if (!computed) {
    return { shouldIdentify: true };
  }

  const newestTimestamp = new Date(computed['@timestamp']).getTime();
  if (Number.isNaN(newestTimestamp)) {
    return { shouldIdentify: true };
  }

  const thresholdMs = thresholdHours * 3_600_000;

  return {
    shouldIdentify: Date.now() - newestTimestamp >= thresholdMs,
  };
}
