/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
} from '../../../common/es_fields/apm';
import { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { OverallLatencyDistributionResponse } from '../latency_distribution/types';

export interface DependencyLatencyDistributionResponse {
  allSpansDistribution: OverallLatencyDistributionResponse;
  failedSpansDistribution: OverallLatencyDistributionResponse;
}

export async function getDependencyLatencyDistribution({
  apmEventClient,
  dependencyName,
  spanName,
  kuery,
  environment,
  start,
  end,
  percentileThreshold,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  spanName: string;
  kuery: string;
  environment: Environment;
  start: number;
  end: number;
  percentileThreshold: number;
}): Promise<DependencyLatencyDistributionResponse> {
  const commonParams = {
    chartType: LatencyDistributionChartType.dependencyLatency,
    apmEventClient,
    start,
    end,
    environment,
    kuery,
    percentileThreshold,
    searchMetrics: false,
  };

  const commonQuery = {
    bool: {
      filter: [
        ...termQuery(SPAN_NAME, spanName),
        ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, dependencyName),
      ],
    },
  };

  const [allSpansDistribution, failedSpansDistribution] = await Promise.all([
    getOverallLatencyDistribution({
      ...commonParams,
      query: commonQuery,
    }),
    getOverallLatencyDistribution({
      ...commonParams,
      query: {
        bool: {
          filter: [commonQuery, ...termQuery(EVENT_OUTCOME, EventOutcome.failure)],
        },
      },
    }),
  ]);

  return {
    allSpansDistribution,
    failedSpansDistribution,
  };
}
