/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DriftSummaryResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-drift-summary';

interface UseDriftSummaryOptions {
  timeRange?: string;
  from?: Date;
  to?: Date;
  categories?: string[];
  severities?: string[];
  hostId?: string;
  page?: number;
  pageSize?: number;
  histogramInterval?: string;
}

interface UseDriftSummaryResult {
  data: DriftSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useDriftSummary = (
  options: UseDriftSummaryOptions = {}
): UseDriftSummaryResult => {
  const {
    timeRange,
    from,
    to,
    categories,
    severities,
    hostId,
    page,
    pageSize,
    histogramInterval,
  } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchDriftSummary = useCallback(async (): Promise<DriftSummaryResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const query: Record<string, string | number | undefined> = {};

    if (from && to) {
      query.from = from.toISOString();
      query.to = to.toISOString();
    } else if (timeRange) {
      query.time_range = timeRange;
    } else {
      query.time_range = '24h';
    }

    if (categories && categories.length > 0) {
      query.categories = categories.join(',');
    }

    if (severities && severities.length > 0) {
      query.severities = severities.join(',');
    }

    if (hostId) {
      query.host_id = hostId;
    }

    if (page !== undefined) {
      query.page = page;
    }

    if (pageSize !== undefined) {
      query.page_size = pageSize;
    }

    if (histogramInterval) {
      query.histogram_interval = histogramInterval;
    }

    const response = await http.get<DriftSummaryResponse>(
      ENDPOINT_ASSETS_ROUTES.DRIFT_SUMMARY,
      { query }
    );

    return response;
  }, [services, timeRange, from, to, categories, severities, hostId, page, pageSize, histogramInterval]);

  const queryKey = [QUERY_KEY, timeRange, from?.getTime(), to?.getTime(), categories, severities, hostId, page, pageSize, histogramInterval];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: fetchDriftSummary,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
