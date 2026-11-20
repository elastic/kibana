/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchQuery } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import type {
  ProfilingSchema,
  ProfilingSchemasAvailability,
  ProfilingStatus,
  TopNFunctions,
} from '@kbn/profiling-utils';
import {
  createFlameGraph,
  type BaseFlameGraph,
  type ElasticFlameGraph,
} from '@kbn/profiling-utils';
import { getRoutePaths } from '../common';
import type {
  IndexLifecyclePhaseSelectOption,
  IndicesStorageDetailsAPIResponse,
  StorageExplorerSummaryAPIResponse,
  StorageHostDetailsAPIResponse,
} from '../common/storage_explorer';
import type { TopNResponse } from '../common/topn';
import type { SetupDataCollectionInstructions } from '../server/routes/universal_profiling/setup/get_cloud_setup_instructions';
import type { AutoAbortedHttpService } from './hooks/use_auto_aborted_http_client';

export interface APMTransactionsPerService {
  [serviceName: string]: {
    serviceName: string;
    transactions: Array<{ name: string | null; samples: number | null }>;
  };
}

export interface Services {
  fetchTopN: (params: {
    http: AutoAbortedHttpService;
    type: string;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    schema?: ProfilingSchema;
  }) => Promise<TopNResponse>;
  fetchTopNFunctions: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    startIndex: number;
    endIndex: number;
    kuery: string;
    schema?: ProfilingSchema;
  }) => Promise<TopNFunctions>;
  fetchElasticFlamechart: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    showErrorFrames: boolean;
    schema?: ProfilingSchema;
  }) => Promise<ElasticFlameGraph>;
  fetchProfilingStatus: (params: { http: AutoAbortedHttpService }) => Promise<ProfilingStatus>;
  fetchAvailableSchemas: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<ProfilingSchemasAvailability>;
  postSetupResources: (params: { http: AutoAbortedHttpService }) => Promise<void>;
  setupDataCollectionInstructions: (params: {
    http: AutoAbortedHttpService;
  }) => Promise<SetupDataCollectionInstructions>;
  fetchStorageExplorerSummary: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<StorageExplorerSummaryAPIResponse>;
  fetchStorageExplorerHostStorageDetails: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<StorageHostDetailsAPIResponse>;
  fetchStorageExplorerIndicesStorageDetails: (params: {
    http: AutoAbortedHttpService;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<IndicesStorageDetailsAPIResponse>;
  fetchTopNFunctionAPMTransactions: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    functionName: string;
    serviceNames: string[];
    schema?: ProfilingSchema;
  }) => Promise<APMTransactionsPerService>;
}

export function getServices(): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async ({ http, type, timeFrom, timeTo, kuery, schema }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        schema,
      };
      return (await http.get(buildPath('/internal/profiling/topn/{type}', { type }), {
        query,
      })) as Promise<TopNResponse>;
    },

    fetchTopNFunctions: async ({ http, timeFrom, timeTo, startIndex, endIndex, kuery, schema }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        startIndex,
        endIndex,
        kuery,
        schema,
      };
      return (await http.get(paths.TopNFunctions, { query })) as Promise<TopNFunctions>;
    },

    fetchElasticFlamechart: async ({ http, timeFrom, timeTo, kuery, showErrorFrames, schema }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        schema,
      };

      const baseFlamegraph = (await http.get(paths.Flamechart, { query })) as BaseFlameGraph;
      return createFlameGraph(baseFlamegraph, showErrorFrames);
    },
    fetchProfilingStatus: async ({ http }) => {
      return (await http.get(paths.Status, {})) as ProfilingStatus;
    },
    fetchAvailableSchemas: async ({ http, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      return (await http.get(paths.Schemas, { query })) as ProfilingSchemasAvailability;
    },
    postSetupResources: async ({ http }) => {
      await http.post(paths.HasSetupESResources, { body: JSON.stringify({}) });
    },
    setupDataCollectionInstructions: async ({ http }) => {
      const instructions = (await http.get(
        paths.SetupDataCollectionInstructions,
        {}
      )) as SetupDataCollectionInstructions;
      return instructions;
    },
    fetchStorageExplorerSummary: async ({ http, timeFrom, timeTo, kuery, indexLifecyclePhase }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        indexLifecyclePhase,
      };
      const summary = (await http.get(paths.StorageExplorerSummary, {
        query,
      })) as StorageExplorerSummaryAPIResponse;
      return summary;
    },
    fetchStorageExplorerHostStorageDetails: async ({
      http,
      timeFrom,
      timeTo,
      kuery,
      indexLifecyclePhase,
    }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        indexLifecyclePhase,
      };
      const eventsMetricsSizeTimeseries = (await http.get(paths.StorageExplorerHostStorageDetails, {
        query,
      })) as StorageHostDetailsAPIResponse;
      return eventsMetricsSizeTimeseries;
    },
    fetchStorageExplorerIndicesStorageDetails: async ({ http, indexLifecyclePhase }) => {
      const query: HttpFetchQuery = {
        indexLifecyclePhase,
      };
      const eventsMetricsSizeTimeseries = (await http.get(
        paths.StorageExplorerIndicesStorageDetails,
        { query }
      )) as IndicesStorageDetailsAPIResponse;
      return eventsMetricsSizeTimeseries;
    },
    fetchTopNFunctionAPMTransactions: ({
      functionName,
      http,
      serviceNames,
      timeFrom,
      timeTo,
      schema,
    }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        functionName,
        serviceNames: JSON.stringify(serviceNames),
        schema,
      };
      return http.get(paths.APMTransactions, {
        query,
      }) as Promise<APMTransactionsPerService>;
    },
  };
}
