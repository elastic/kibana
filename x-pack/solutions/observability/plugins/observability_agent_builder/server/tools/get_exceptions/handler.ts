/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { getErrorGroups } from './get_error_groups';
import { getLogExceptionGroups } from './get_otel_log_exceptions';

type GetErrorGroupsResult = Awaited<ReturnType<typeof getToolHandler>>;
export type ErrorGroup = GetErrorGroupsResult['errorGroups'][number];

export async function getToolHandler({
  core,
  plugins,
  request,
  esClient,
  logger,
  start,
  end,
  kqlFilter,
  includeStackTrace,
  includeFirstSeen,
  size,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string;
  end: string;
  kqlFilter: string | undefined;
  includeStackTrace: boolean;
  includeFirstSeen: boolean;
  size: number;
}) {
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  // Query error groups and log exception groups in parallel
  const [errorGroups, logExceptionGroups] = await Promise.all([
    getErrorGroups({
      apmEventClient,
      startMs,
      endMs,
      kqlFilter,
      includeStackTrace,
      includeFirstSeen,
      size,
      logger,
    }),
    getLogExceptionGroups({
      core,
      esClient,
      startMs,
      endMs,
      kqlFilter,
      includeStackTrace,
      size,
      logger,
    }),
  ]);

  return { errorGroups, logExceptionGroups };
}
