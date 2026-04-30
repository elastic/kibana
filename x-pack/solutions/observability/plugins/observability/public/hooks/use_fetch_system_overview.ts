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
const EVENTS_INDEX = 'sigevents-events-ms';
const DETECTIONS_INDEX = 'sigevents-detections-ms';

export interface EventDocument {
  '@timestamp': string;
  event_id: string;
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
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendations?: string[];
  recommended_action: 'escalate' | 'monitor' | 'resolve';
  last_reviewed_at: string;
}

export interface SystemOverviewData {
  services: Array<{ name: string; traceCount: number; logCount: number }>;
  acknowledgedEvents: EventDocument[];
  detectionCount: number;
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

      const eventsParams: estypes.SearchRequest = {
        index: EVENTS_INDEX,
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

      const [traceServicesResp, logServicesResp, eventsResp, detectionsResp] = await Promise.all([
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
            { rawResponse: estypes.SearchResponse<EventDocument> }
          >({ params: eventsParams }, { abortSignal: signal })
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

      const acknowledgedEvents = (eventsResp.rawResponse.hits.hits ?? [])
        .map((hit) => hit._source)
        .filter((doc): doc is EventDocument => doc !== undefined);

      const detectionCount =
        typeof detectionsResp.rawResponse.hits.total === 'object'
          ? detectionsResp.rawResponse.hits.total.value
          : detectionsResp.rawResponse.hits.total ?? 0;

      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      for (const ev of acknowledgedEvents) {
        switch (ev.impact) {
          case 'critical':
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
        acknowledgedEvents,
        detectionCount,
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
