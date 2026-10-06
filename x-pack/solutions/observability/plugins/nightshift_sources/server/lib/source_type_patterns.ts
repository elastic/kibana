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
  loadSourceTypePatterns,
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

const isForbiddenSavedObjectError = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isForbiddenError(error);

const readApmIndices = async ({
  apmSourcesAccess,
  apmIndicesFromConfig,
  soClient,
  logger,
}: SourceTypePatternDependencies & {
  apmSourcesAccess: ApmSourcesAccessPluginStart;
}): Promise<ApmIndexPatternFields> => {
  try {
    return await apmSourcesAccess.getApmIndices(soClient);
  } catch (error) {
    // Nightshift does not grant `apm-indices`. The plugin config still names traces, logs
    // and metrics; an empty list would store `FROM apm-*` as unknown and reject the default
    // transaction pattern. Any other failure must fail the write, not be persisted as [].
    if (isForbiddenSavedObjectError(error) && apmIndicesFromConfig) {
      logger.warn(
        'Could not read APM index overrides for source type detection, using the configured defaults'
      );
      return apmIndicesFromConfig;
    }
    throw error;
  }
};

const readSourceTypePatterns = (
  dependencies: SourceTypePatternDependencies
): Promise<SourceTypePatterns> => {
  const { logsDataAccess, apmSourcesAccess, soClient } = dependencies;
  return loadSourceTypePatterns({
    readLogSources: logsDataAccess
      ? async () => {
          const logSources =
            await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(soClient);
          return logSources.getFlattenedLogSources();
        }
      : undefined,
    readApmIndices: apmSourcesAccess
      ? () => readApmIndices({ ...dependencies, apmSourcesAccess })
      : undefined,
  });
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
    patternsPromise ??= readSourceTypePatterns(dependencies);
    return patternsPromise;
  };
};
