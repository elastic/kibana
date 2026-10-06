/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import {
  combineSourceTypePatterns,
  patternsFromApmIndices,
  uniqueSourceTypePatternTokens,
  type SourceTypePatterns,
} from '@kbn/nightshift-shared';

export interface SourceTypePatternPlugins {
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

const EMPTY_APM_PATTERNS: SourceTypePatterns = { logs: [], traces: [], metrics: [] };

/**
 * Schema defaults from `indicesSchema` in apm_sources_access. Copied because a 403 means this
 * page cannot ask the plugin. kibana.yml overrides are applied on save, not here.
 */
const DEFAULT_APM_INDEX_PATTERNS = {
  transaction: 'traces-apm*,apm-*,traces-*.otel-*',
  span: 'traces-apm*,apm-*,traces-*.otel-*',
  error: 'logs-apm*,apm-*,logs-*.otel-*',
  metric: 'metrics-apm*,apm-*,metrics-*.otel-*',
} as const;

const isForbiddenResponse = (error: unknown): boolean => {
  if (!(error instanceof Error) || !('response' in error)) {
    return false;
  }
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 403;
};

const readLogPatterns = async (
  logsDataAccess: LogsDataAccessPluginStart | undefined
): Promise<string[]> => {
  if (!logsDataAccess) {
    return [];
  }
  return uniqueSourceTypePatternTokens([
    await logsDataAccess.services.logSourcesService.getFlattenedLogSources(),
  ]);
};

const readApmPatterns = async (
  apmSourcesAccess: ApmSourceAccessPluginStart | undefined
): Promise<SourceTypePatterns> => {
  if (!apmSourcesAccess) {
    return EMPTY_APM_PATTERNS;
  }
  try {
    return patternsFromApmIndices(await apmSourcesAccess.getApmIndices());
  } catch (error) {
    // The indices route requires the `apm` privilege, which Nightshift does not grant.
    // Schema defaults keep the logs check alive. kibana.yml overrides are not in the browser;
    // the server applies those on save.
    if (isForbiddenResponse(error)) {
      return patternsFromApmIndices(DEFAULT_APM_INDEX_PATTERNS);
    }
    throw error;
  }
};

/**
 * Configured log sources and APM indices for the current user. A plugin that is not
 * installed contributes nothing. An APM 403 uses the default APM index patterns and still
 * returns log sources. Any other failure is `null`, so the caller skips the client-side
 * type check and the server fails the write.
 * Reads on every call: log sources come from ui settings, APM indices are one request.
 */
export const getSourceTypePatterns = async ({
  logsDataAccess,
  apmSourcesAccess,
}: SourceTypePatternPlugins): Promise<SourceTypePatterns | null> => {
  try {
    const [logSourceTokens, apmPatterns] = await Promise.all([
      readLogPatterns(logsDataAccess),
      readApmPatterns(apmSourcesAccess),
    ]);
    return combineSourceTypePatterns(logSourceTokens, apmPatterns);
  } catch {
    return null;
  }
};
