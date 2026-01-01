/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getApmIndices } from '../../utils/get_apm_indices';
import { parseDatemath } from '../../utils/time';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { MAX_COMBINED_EVENTS, type ChangeType } from './constants';
import { searchLogsForChangeEvents } from './queries/search_logs_for_change_events';
import { searchTracesForCicdEvents } from './queries/search_traces_for_cicd_events';
import { getServiceVersions } from './queries/get_service_versions';

/**
 * Generates a simple summary of change events for LLM consumption.
 */
function generateSummary(logCount: number, traceCount: number, versionCount: number): string {
  const total = logCount + traceCount;
  if (total === 0) {
    return 'No change events found in the specified time range.';
  }

  const parts = [`Found ${total} change event${total !== 1 ? 's' : ''}`];

  if (logCount > 0 && traceCount > 0) {
    parts.push(`(${logCount} from logs, ${traceCount} from CI/CD traces)`);
  }

  if (versionCount > 0) {
    parts.push(`with ${versionCount} new version${versionCount !== 1 ? 's' : ''} detected`);
  }

  return parts.join(' ') + '.';
}

export async function getChangeEventsHandler({
  esClient,
  core,
  plugins,
  logger,
  start,
  end,
  serviceName,
  environment,
  changeTypes,
  kqlFilter,
  changeEventFields,
}: {
  esClient: IScopedClusterClient;
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  start: string;
  end: string;
  serviceName?: string;
  environment?: string;
  changeTypes: ChangeType[];
  kqlFilter?: string;
  changeEventFields: string[];
}) {
  const [logsIndices, apmIndices] = await Promise.all([
    getLogsIndices({ core, logger }),
    getApmIndices({ core, plugins, logger }),
  ]);

  const parsedTimeRange = {
    start: parseDatemath(start),
    end: parseDatemath(end, { roundUp: true }),
  };

  type VersionsByService = Record<
    string,
    Array<{ version: string; firstSeen: string; lastSeen: string }>
  >;

  const [logsEvents, tracesEvents, versionsByService] = await Promise.all([
    // Query 1: Search logs for change events (ECS, K8s events)
    searchLogsForChangeEvents({
      esClient,
      logsIndices,
      parsedTimeRange,
      serviceName,
      environment,
      changeTypes,
      kqlFilter,
      changeEventFields,
    }),
    // Query 2: Search traces for CI/CD pipeline spans (OTel SemConv)
    changeTypes.includes('deployment')
      ? searchTracesForCicdEvents({
          esClient,
          apmIndices,
          parsedTimeRange,
          serviceName,
          environment,
        })
      : Promise.resolve([]),
    // Query 3: Aggregate service versions to detect version changes
    changeTypes.includes('deployment')
      ? getServiceVersions({
          esClient,
          apmIndices,
          parsedTimeRange,
          serviceName,
          environment,
        })
      : Promise.resolve({} as VersionsByService),
  ]);

  // Merge results, sorted by timestamp descending
  const allEvents = orderBy([...logsEvents, ...tracesEvents], ['@timestamp'], ['desc']).slice(
    0,
    MAX_COMBINED_EVENTS
  );

  const versionCount = Object.values(versionsByService).reduce(
    (acc, versions) => acc + versions.length,
    0
  );

  return {
    summary: generateSummary(logsEvents.length, tracesEvents.length, versionCount),
    total: allEvents.length,
    events: allEvents,
    sources: {
      logs: logsEvents.length,
      traces: tracesEvents.length,
    },
    versionsByService,
  };
}
