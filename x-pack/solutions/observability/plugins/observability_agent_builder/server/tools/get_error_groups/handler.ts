/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { ERROR_GROUP_ID } from '@kbn/observability-shared-plugin/common';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { getErrorGroupSamples } from './get_error_group_samples';
import { getDownstreamServicePerGroup } from './get_downstream_service_resources';
import { getFirstSeenPerGroup } from './get_first_seen_per_group';
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
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string;
  end: string;
  kqlFilter?: string;
  includeStackTrace?: boolean;
  includeFirstSeen?: boolean;
}) {
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  // Query error groups and log exception groups in parallel
  const [errorGroups, logExceptionGroups] = await Promise.all([
    getApmErrorGroups({
      apmEventClient,
      startMs,
      endMs,
      kqlFilter,
      includeStackTrace,
      includeFirstSeen,
      logger,
    }),
    getLogExceptionGroups({
      core,
      esClient,
      startMs,
      endMs,
      kqlFilter,
      includeStackTrace,
      logger,
    }),
  ]);

  return { errorGroups, logExceptionGroups };
}

async function getApmErrorGroups({
  apmEventClient,
  startMs,
  endMs,
  kqlFilter,
  includeStackTrace,
  includeFirstSeen,
  logger,
}: {
  apmEventClient: Awaited<ReturnType<typeof buildApmResources>>['apmEventClient'];
  startMs: number;
  endMs: number;
  kqlFilter?: string;
  includeStackTrace?: boolean;
  includeFirstSeen?: boolean;
  logger: Logger;
}) {
  const errorGroups = await getErrorGroupSamples({
    apmEventClient,
    startMs,
    endMs,
    kqlFilter,
    includeStackTrace,
    logger,
  });

  const [firstSeenMap, downstreamServiceMap] = await Promise.all([
    includeFirstSeen
      ? getFirstSeenPerGroup({ apmEventClient, errorGroups, endMs, logger })
      : new Map<string, string>(),
    getDownstreamServicePerGroup({ apmEventClient, errorGroups, startMs, endMs, logger }),
  ]);

  return errorGroups.map((errorGroup) => {
    const groupId = errorGroup.sample[ERROR_GROUP_ID];
    const downstreamServiceResource = downstreamServiceMap.get(groupId);
    const firstSeen = firstSeenMap.get(groupId);

    return { ...errorGroup, firstSeen, downstreamServiceResource };
  });
}
