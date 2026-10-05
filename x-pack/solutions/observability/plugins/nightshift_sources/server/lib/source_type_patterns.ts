/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { uniqueSourceTypePatternTokens, type SourceTypePatterns } from '@kbn/nightshift-shared';

export interface SourceTypePatternDependencies {
  soClient: SavedObjectsClientContract;
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourcesAccessPluginStart;
  logger: Logger;
}

const tokensOrDefault = (
  result: PromiseSettledResult<string[]>,
  label: string,
  logger: Logger
): string[] => {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  // Fail open to the built-in bases. A role that cannot read these settings can still create a
  // source over `logs-*`; a custom pattern then classifies as unknown and the mix check rejects it.
  logger.warn(
    `Could not read ${label} for source type detection, using the built-in patterns: ${result.reason}`
  );
  return [];
};

const readLogPatterns = async ({
  logsDataAccess,
  soClient,
}: SourceTypePatternDependencies): Promise<string[]> => {
  if (!logsDataAccess) {
    return [];
  }
  const logSources = await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
    soClient
  );
  return uniqueSourceTypePatternTokens([await logSources.getFlattenedLogSources()]);
};

const readTracePatterns = async ({
  apmSourcesAccess,
  soClient,
}: SourceTypePatternDependencies): Promise<string[]> => {
  if (!apmSourcesAccess) {
    return [];
  }
  const { transaction, span } = await apmSourcesAccess.getApmIndices(soClient);
  return uniqueSourceTypePatternTokens([transaction, span]);
};

const loadSourceTypePatterns = async (
  dependencies: SourceTypePatternDependencies
): Promise<SourceTypePatterns> => {
  const [logs, traces] = await Promise.allSettled([
    readLogPatterns(dependencies),
    readTracePatterns(dependencies),
  ]);
  return {
    logs: tokensOrDefault(logs, 'log sources', dependencies.logger),
    traces: tokensOrDefault(traces, 'APM indices', dependencies.logger),
  };
};

/**
 * Reads configured log sources and APM trace indices once per client. Later calls in the same
 * request reuse that result. A missing plugin contributes nothing; a failed read falls back to
 * the built-in base patterns.
 */
export const createGetSourceTypePatterns = (
  dependencies: SourceTypePatternDependencies
): (() => Promise<SourceTypePatterns>) => {
  let pending: Promise<SourceTypePatterns> | undefined;
  return () => {
    pending ??= loadSourceTypePatterns(dependencies);
    return pending;
  };
};
