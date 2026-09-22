/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { catchAndWrapError } from './wrap_errors';

/**
 * Returns `true` when at least one remote cluster is currently connected.
 *
 * Pure Elasticsearch check: no caching and no feature-flag gating. Rejects if `remoteInfo()` fails
 * so the caller can decide how to handle it — a transient failure must not be pinned as `false`,
 * which would hide remote endpoints. Prefer `EndpointAppContextService#isCcsEnabled`, which layers
 * the feature-flag gate and caching on top of this.
 */
export const hasConnectedRemoteClusters = async (
  esClient: ElasticsearchClient
): Promise<boolean> => {
  const response = await esClient.cluster.remoteInfo().catch(catchAndWrapError);
  return Object.values(response).some((remote) => remote.connected);
};

export const prefixIndexPatternsWithCcs = (indexPattern: string, ccsEnabled: boolean): string => {
  if (!ccsEnabled) {
    return indexPattern;
  }

  const patterns = indexPattern.split(',');
  const ccsPatterns = patterns.map((p) => `*:${p}`);

  return [...patterns, ...ccsPatterns].join(',');
};
