/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import { uniqueSourceTypePatternTokens, type SourceTypePatterns } from '@kbn/nightshift-shared';

export interface SourceTypePatternPlugins {
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

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

const readTracePatterns = async (
  apmSourcesAccess: ApmSourceAccessPluginStart | undefined
): Promise<string[]> => {
  if (!apmSourcesAccess) {
    return [];
  }
  const { transaction, span } = await apmSourcesAccess.getApmIndices();
  return uniqueSourceTypePatternTokens([transaction, span]);
};

/**
 * Configured log sources and APM trace indices for the current user. A plugin that is not
 * installed contributes nothing. A plugin that is installed but fails makes the whole lookup
 * `null`, so the caller can skip the client-side type check and let the server answer.
 * Reads on every call: log sources come from ui settings, APM indices are one request.
 */
export const getSourceTypePatterns = async ({
  logsDataAccess,
  apmSourcesAccess,
}: SourceTypePatternPlugins): Promise<SourceTypePatterns | null> => {
  try {
    const [logs, traces] = await Promise.all([
      readLogPatterns(logsDataAccess),
      readTracePatterns(apmSourcesAccess),
    ]);
    return { logs, traces };
  } catch (error) {
    return null;
  }
};
