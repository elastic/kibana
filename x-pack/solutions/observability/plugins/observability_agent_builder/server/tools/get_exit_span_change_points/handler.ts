/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { buildApmResources } from '../../utils/build_apm_resources';
import type { TimeseriesChangePoint } from './get_apm_timeseries';
import { ApmTimeseriesType, getApmTimeseries } from './get_apm_timeseries';

export interface ChangePointGrouping {
  title: string;
  grouping: string;
  changes: TimeseriesChangePoint[];
}

export async function getExitSpanChangePoints({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  serviceName,
  serviceEnvironment,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  serviceName: string | undefined;
  serviceEnvironment: string | undefined;
}): Promise<ChangePointGrouping[]> {
  if (!serviceName || !serviceEnvironment) {
    return [];
  }

  const { apmEventClient } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const res = await getApmTimeseries({
    apmEventClient,
    arguments: {
      start,
      end,
      stats: [
        {
          title: 'Exit span latency',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.exitSpanLatency,
          },
        },
        {
          title: 'Exit span failure rate',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.exitSpanFailureRate,
          },
        },
      ],
    },
  });

  return res
    .filter((timeseries) => timeseries.changes.length > 0)
    .map((timeseries) => {
      return {
        title: timeseries.stat.title,
        grouping: timeseries.id,
        changes: timeseries.changes,
      };
    });
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  serviceName,
  serviceEnvironment,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  serviceName: string;
  serviceEnvironment: string;
}): Promise<ChangePointGrouping[]> {
  return getExitSpanChangePoints({
    core,
    plugins,
    request,
    logger,
    start,
    end,
    serviceName,
    serviceEnvironment,
  });
}
