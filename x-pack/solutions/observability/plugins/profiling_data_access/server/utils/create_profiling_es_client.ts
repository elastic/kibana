/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type {
  BaseFlameGraph,
  ESTopNFunctions,
  ProfilingStatusResponse,
  StackTraceResponse,
} from '@kbn/profiling-utils';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import type { CreateProfilingEsClient } from './profiling_es_client';
import { withProfilingSpan } from './with_profiling_span';

const PROFILING_STATUS_TIMEOUT_SECONDS = 60;

/** Creates a profiling ES client; when `abortSignal` is given, ES requests are cancelled once it aborts. */
export const createProfilingEsClient: CreateProfilingEsClient = ({ esClient, abortSignal }) => {
  const requestOptions = { signal: abortSignal, meta: true } as const;

  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const promise = withProfilingSpan(
        operationName,
        () =>
          esClient.search(searchRequest, requestOptions) as unknown as Promise<{
            body: InferSearchResponseOf<TDocument, TSearchRequest>;
          }>
      );

      return unwrapEsResponse(promise);
    },
    profilingStacktraces({
      query,
      sampleSize,
      durationSeconds,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      indices,
      stacktraceIdsField,
      schema,
    }) {
      const promise = withProfilingSpan('_profiling/stacktraces', () =>
        esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/stacktraces'),
            body: {
              query,
              sample_size: sampleSize,
              requested_duration: durationSeconds,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
              schema,
            },
          },
          requestOptions
        )
      );

      return unwrapEsResponse(promise) as Promise<StackTraceResponse>;
    },
    getEsClient() {
      return esClient;
    },
    profilingFlamegraph({
      query,
      sampleSize,
      durationSeconds,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      indices,
      stacktraceIdsField,
      schema,
    }) {
      const promise = withProfilingSpan('_profiling/flamegraph', () =>
        esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/flamegraph'),
            body: {
              query,
              sample_size: sampleSize,
              requested_duration: durationSeconds,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
              schema,
            },
          },
          requestOptions
        )
      );

      return unwrapEsResponse(promise) as Promise<BaseFlameGraph>;
    },
    topNFunctions({
      query,
      aggregationFields,
      indices,
      stacktraceIdsField,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      sampleSize,
      limit,
      durationSeconds,
      schema,
    }) {
      const promise = withProfilingSpan('_profiling/topn/functions', () =>
        esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/topn/functions'),
            body: {
              query,
              sample_size: sampleSize,
              limit,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
              aggregation_fields: aggregationFields,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              requested_duration: durationSeconds,
              schema,
            },
          },
          requestOptions
        )
      );

      return unwrapEsResponse(promise) as Promise<ESTopNFunctions>;
    },
    universalProfiling: {
      status({ waitForResourcesCreated = false } = {}) {
        // Waiting for resources to be created can take a while, so give ES more time and retry on timeouts.
        const waitTimeout = waitForResourcesCreated
          ? `&timeout=${PROFILING_STATUS_TIMEOUT_SECONDS + 5}s`
          : '';
        const waitOptions = waitForResourcesCreated
          ? {
              requestTimeout: PROFILING_STATUS_TIMEOUT_SECONDS * 1000,
              maxRetries: 5,
              retryOnTimeout: true,
            }
          : {};

        const promise = withProfilingSpan('_profiling/status', () =>
          esClient.transport.request(
            {
              method: 'GET',
              path: encodeURI(
                `/_profiling/status?wait_for_resources_created=${waitForResourcesCreated}${waitTimeout}`
              ),
            },
            { ...requestOptions, ...waitOptions }
          )
        );

        return unwrapEsResponse(promise) as Promise<ProfilingStatusResponse>;
      },
    },
  };
};
