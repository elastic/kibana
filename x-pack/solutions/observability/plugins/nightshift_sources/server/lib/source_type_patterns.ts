/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import {
  combineSourceTypePatterns,
  patternsFromApmIndices,
  uniqueSourceTypePatternTokens,
  type ApmIndexPatternFields,
  type SourceTypePatterns,
} from '@kbn/nightshift-shared';

export interface SourceTypePatternDependencies {
  soClient: SavedObjectsClientContract;
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourcesAccessPluginStart;
  /**
   * `apmIndicesFromConfigFile` from the APM setup contract: schema defaults plus kibana.yml,
   * without reading the saved object.
   */
  apmIndicesFromConfig?: ApmIndexPatternFields;
  logger: Logger;
}

const EMPTY_APM_PATTERNS: SourceTypePatterns = { logs: [], traces: [], metrics: [] };

const isForbiddenSavedObjectError = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isForbiddenError(error);

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

const readApmPatterns = async ({
  apmSourcesAccess,
  apmIndicesFromConfig,
  soClient,
  logger,
}: SourceTypePatternDependencies): Promise<SourceTypePatterns> => {
  if (!apmSourcesAccess) {
    return EMPTY_APM_PATTERNS;
  }
  try {
    return patternsFromApmIndices(await apmSourcesAccess.getApmIndices(soClient));
  } catch (error) {
    // Nightshift does not grant `apm-indices`. The plugin config still names traces, logs
    // and metrics; an empty list would store `FROM apm-*` as unknown and reject the default
    // transaction pattern. Any other failure must fail the write, not be persisted as [].
    if (isForbiddenSavedObjectError(error) && apmIndicesFromConfig) {
      logger.warn(
        'Could not read APM index overrides for source type detection, using the configured defaults'
      );
      return patternsFromApmIndices(apmIndicesFromConfig);
    }
    throw error;
  }
};

const loadSourceTypePatterns = async (
  dependencies: SourceTypePatternDependencies
): Promise<SourceTypePatterns> => {
  const [logSourceTokens, apmPatterns] = await Promise.all([
    readLogPatterns(dependencies),
    readApmPatterns(dependencies),
  ]);
  return combineSourceTypePatterns(logSourceTokens, apmPatterns);
};

/**
 * Reads configured log sources and APM indices once per client. Later calls in the same
 * request reuse that result. A missing plugin contributes nothing. A forbidden APM read
 * uses the APM plugin config. Any other failed read rejects, so the write is not stored.
 */
export const createGetSourceTypePatterns = (
  dependencies: SourceTypePatternDependencies
): (() => Promise<SourceTypePatterns>) => {
  let patternsPromise: Promise<SourceTypePatterns> | undefined;
  return () => {
    patternsPromise ??= loadSourceTypePatterns(dependencies);
    return patternsPromise;
  };
};
