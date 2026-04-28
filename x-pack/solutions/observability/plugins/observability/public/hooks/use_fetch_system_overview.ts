/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '../utils/kibana_react';

const TRACES_INDEX = 'traces-*';
const LOGS_INDEX = 'logs-*';
const VERDICTS_INDEX = 'sigevents-verdicts-ms';
const DETECTIONS_INDEX = 'sigevents-detections-ms';

export interface VerdictDocument {
  '@timestamp': string;
  verdict_id: string;
  discovery_id: string;
  discovery_slug: string;
  verdict: 'promoted' | 'acknowledged' | 'demoted';
  title: string;
  summary: string;
  root_cause: string;
  rule_names: string[];
  stream_names: string[];
  criticality: number;
  confidence: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendations?: string[];
  recommended_action: 'escalate' | 'monitor' | 'resolve';
  verdict_summary: string;
}

export interface SystemOverviewData {
  services: Array<{ name: string; traceCount: number; logCount: number }>;
  verdicts: VerdictDocument[];
  detectionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

interface ServiceAggBucket {
  key: string;
  doc_count: number;
}

interface ServicesAggResponse {
  aggregations?: {
    services: {
      buckets: ServiceAggBucket[];
    };
  };
}

export function useFetchSystemOverview(): {
  loading: boolean;
  error: Error | null;
  data: SystemOverviewData | null;
  refetch: () => void;
} {
  const { services } = useKibana();
  const { data: dataService } = services;

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useQuery<SystemOverviewData, Error>(
    ['systemOverview'],
    async ({ signal }) => {
      const traceServicesParams: estypes.SearchRequest = {
        index: TRACES_INDEX,
        size: 0,
        aggs: {
          services: {
            terms: { field: 'service.name', size: 100 },
          },
        },
      };

      const logServicesParams: estypes.SearchRequest = {
        index: LOGS_INDEX,
        size: 0,
        aggs: {
          services: {
            terms: { field: 'service.name', size: 100 },
          },
        },
      };

      const verdictsParams: estypes.SearchRequest = {
        index: VERDICTS_INDEX,
        size: 100,
        query: {
          bool: {
            must_not: [{ term: { verdict: 'promoted' } }],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
      };

      const detectionsParams: estypes.SearchRequest = {
        index: DETECTIONS_INDEX,
        size: 0,
        query: {
          bool: {
            must_not: [{ term: { superseded: true } }],
          },
        },
      };

      const [traceServicesResp, logServicesResp, verdictsResp, detectionsResp] = await Promise.all([
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<unknown> & ServicesAggResponse }
          >({ params: traceServicesParams }, { abortSignal: signal })
        ),
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<unknown> & ServicesAggResponse }
          >({ params: logServicesParams }, { abortSignal: signal })
        ),
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<VerdictDocument> }
          >({ params: verdictsParams }, { abortSignal: signal })
        ),
        lastValueFrom(
          dataService.search.search<
            { params: estypes.SearchRequest },
            { rawResponse: estypes.SearchResponse<unknown> }
          >({ params: detectionsParams }, { abortSignal: signal })
        ),
      ]);

      const traceServiceMap = new Map<string, number>();
      const traceBuckets = traceServicesResp.rawResponse.aggregations?.services?.buckets ?? [];
      for (const bucket of traceBuckets) {
        traceServiceMap.set(bucket.key, bucket.doc_count);
      }

      const logServiceMap = new Map<string, number>();
      const logBuckets = logServicesResp.rawResponse.aggregations?.services?.buckets ?? [];
      for (const bucket of logBuckets) {
        logServiceMap.set(bucket.key, bucket.doc_count);
      }

      const allServiceNames = new Set([...traceServiceMap.keys(), ...logServiceMap.keys()]);
      const servicesList = Array.from(allServiceNames).map((name) => ({
        name,
        traceCount: traceServiceMap.get(name) ?? 0,
        logCount: logServiceMap.get(name) ?? 0,
      }));

      servicesList.sort((a, b) => b.traceCount + b.logCount - (a.traceCount + a.logCount));

      const verdicts = (verdictsResp.rawResponse.hits.hits ?? [])
        .map((hit) => hit._source)
        .filter((doc): doc is VerdictDocument => doc !== undefined);

      const detectionCount =
        typeof detectionsResp.rawResponse.hits.total === 'object'
          ? detectionsResp.rawResponse.hits.total.value
          : detectionsResp.rawResponse.hits.total ?? 0;

      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      for (const v of verdicts) {
        switch (v.impact) {
          case 'critical':
            criticalCount++;
            break;
          case 'high':
            highCount++;
            break;
          case 'medium':
            mediumCount++;
            break;
          case 'low':
            lowCount++;
            break;
        }
      }

      return {
        services: servicesList,
        verdicts,
        detectionCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      };
    },
    {
      enabled: !!dataService?.search?.search,
      keepPreviousData: true,
      retry: 1,
    }
  );

  const overviewData = useMemo(() => result ?? null, [result]);

  return {
    loading: isLoading,
    error: error ?? null,
    data: overviewData,
    refetch,
  };
}
