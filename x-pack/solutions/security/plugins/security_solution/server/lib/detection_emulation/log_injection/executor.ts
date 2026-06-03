/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EcsEmulationDocument } from './generator';

export interface ExecuteLogInjectionInput {
  scenarioId: string;
  docs: EcsEmulationDocument[];
  spaceId: string;
  /** Must be true — executor throws if the detectionEmulationLogInjection flag is off. */
  logInjectionEnabled: boolean;
}

export interface ExecuteLogInjectionDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export interface LogInjectionResult {
  scenarioId: string;
  injectedDocIds: string[];
}

/** Index name prefix shared with the telemetry collector for ancestor-based alert lookup. */
export const EMULATION_INDEX_PREFIX = '.kibana-security-emulation-logs-';

const buildIndexName = (spaceId: string): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  return `${EMULATION_INDEX_PREFIX}${spaceId}-${date}`;
};

/**
 * Bulk-indexes synthesized ECS documents into the space-scoped emulation logs
 * index. Gated by the `detectionEmulationLogInjection` experimental flag.
 */
export const executeLogInjection = async (
  input: ExecuteLogInjectionInput,
  deps: ExecuteLogInjectionDeps
): Promise<LogInjectionResult> => {
  const { scenarioId, docs, spaceId, logInjectionEnabled } = input;
  const { esClient, logger } = deps;

  if (!logInjectionEnabled) {
    throw new Error('Log injection is disabled (detectionEmulationLogInjection flag is off)');
  }

  if (docs.length === 0) {
    return { scenarioId, injectedDocIds: [] };
  }

  const index = buildIndexName(spaceId);
  logger.debug(`[log_injection] Bulk-indexing ${docs.length} docs into ${index}`);

  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: docs.flatMap((doc) => [{ index: { _index: index } }, doc]),
  });

  const injectedDocIds = response.items.flatMap((item) => {
    const result = item.index;
    return result?._id && result.result === 'created' ? [result._id] : [];
  });

  if (response.errors) {
    logger.warn(
      `[log_injection] ${docs.length - injectedDocIds.length}/${docs.length} docs failed to index`
    );
  }

  return { scenarioId, injectedDocIds };
};
