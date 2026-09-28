/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type {
  BaseFlameGraph,
  ESTopNFunctions,
  ProfilingStatusResponse,
  StackTraceResponse,
} from '@kbn/profiling-utils';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import type { ProfilingESClient } from './profiling_es_client';
import { withProfilingSpan } from './with_profiling_span';

const PROFILING_STATUS_TIMEOUT_SECONDS = 60;

const cancelEsRequestOnAbort = <T>(
  promise: Promise<T>,
  controller: AbortController,
  request?: KibanaRequest
): Promise<T> => {
  if (!request) {
    return promise;
  }

  const subscription = request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  return promise.finally(() => subscription.unsubscribe());
};

/** Creates a profiling ES client; when `request` is given, ES requests are cancelled if it's aborted. */
export function createProfilingEsClient({
  esClient,
  request,
}: {
  esClient: ElasticsearchClient;
  request?: KibanaRequest;
}): ProfilingESClient {
  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const controller = new AbortController();

      const promise = withProfilingSpan(operationName, () => {
        return cancelEsRequestOnAbort(
          esClient.search(searchRequest, {
            signal: controller.signal,
            meta: true,
          }) as unknown as Promise<{
            body: InferSearchResponseOf<TDocument, TSearchRequest>;
          }>,
          controller,
          request
        );
      });

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
    }) {
      const controller = new AbortController();
      const promise = withProfilingSpan('_profiling/stacktraces', () => {
        return cancelEsRequestOnAbort(
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
              },
            },
            {
              signal: controller.signal,
              meta: true,
            }
          ),
          controller,
          request
        );
      });

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
    }) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/flamegraph', () => {
        return esClient.transport.request(
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
            },
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });
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
    }) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/topn/functions', () => {
        return esClient.transport.request(
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
            },
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });
      return unwrapEsResponse(promise) as Promise<ESTopNFunctions>;
    },
    universalProfiling: {
      status({ waitForResourcesCreated = false } = {}) {
        const controller = new AbortController();

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

        const promise = withProfilingSpan('_profiling/status', () => {
          return cancelEsRequestOnAbort(
            esClient.transport.request(
              {
                method: 'GET',
                path: encodeURI(
                  `/_profiling/status?wait_for_resources_created=${waitForResourcesCreated}${waitTimeout}`
                ),
              },
              {
                signal: controller.signal,
                meta: true,
                ...waitOptions,
              }
            ),
            controller,
            request
          );
        });

        return unwrapEsResponse(promise) as Promise<ProfilingStatusResponse>;
      },
    },
  };
}
