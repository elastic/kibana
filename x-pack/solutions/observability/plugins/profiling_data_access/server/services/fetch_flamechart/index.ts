/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import {
  profilingAWSCostDiscountRate,
  profilingCo2PerKWH,
  profilingCostPervCPUPerHour,
  profilingDatacenterPUE,
  profilingPervCPUWattArm64,
  profilingPervCPUWattX86,
  profilingAzureCostDiscountRate,
} from '@kbn/observability-plugin/common';
import { percentToFactor } from '../../utils/percent_to_factor';
import { RegisterServicesParams } from '../register_services';

export interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  core: CoreRequestHandlerContext;
  indices?: string[];
  stacktraceIdsField?: string;
  query: QueryDslQueryContainer;
  totalSeconds: number;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    core,
    esClient,
    indices,
    stacktraceIdsField,
    query,
    totalSeconds,
  }: FetchFlamechartParams) => {
    const [
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate,
      costPervCPUPerHour,
      azureCostDiscountRate,
    ] = await Promise.all([
      core.uiSettings.client.get<number>(profilingCo2PerKWH),
      core.uiSettings.client.get<number>(profilingDatacenterPUE),
      core.uiSettings.client.get<number>(profilingPervCPUWattX86),
      core.uiSettings.client.get<number>(profilingPervCPUWattArm64),
      core.uiSettings.client.get<number>(profilingAWSCostDiscountRate),
      core.uiSettings.client.get<number>(profilingCostPervCPUPerHour),
      core.uiSettings.client.get<number>(profilingAzureCostDiscountRate),
    ]);

    const profilingEsClient = createProfilingEsClient({ esClient });

    const flamegraph = await profilingEsClient.profilingFlamegraph({
      query,
      sampleSize: targetSampleSize,
      durationSeconds: totalSeconds,
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate: percentToFactor(awsCostDiscountRate),
      costPervCPUPerHour,
      azureCostDiscountRate: percentToFactor(azureCostDiscountRate),
      indices,
      stacktraceIdsField,
    });
    return { ...flamegraph, TotalSeconds: totalSeconds };
  };
}
