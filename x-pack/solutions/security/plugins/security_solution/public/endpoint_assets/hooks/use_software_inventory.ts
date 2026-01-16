/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SoftwareInventoryResponse, SoftwareType } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';

const QUERY_KEY = 'endpoint-assets-software-inventory';

interface UseSoftwareInventoryOptions {
  hostId: string;
  search?: string;
  type?: SoftwareType | 'all';
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  /** Filter to show only software seen within the last X hours (for "current only" view) */
  maxStaleHours?: number;
}

interface UseSoftwareInventoryResult {
  data: SoftwareInventoryResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useSoftwareInventory = (
  options: UseSoftwareInventoryOptions
): UseSoftwareInventoryResult => {
  const { hostId, search, type, page, perPage, sortField, sortDirection, maxStaleHours } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchSoftwareInventory = useCallback(async (): Promise<SoftwareInventoryResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const query: Record<string, string | number | undefined> = {};

    if (search) {
      query.search = search;
    }

    if (type) {
      query.type = type;
    }

    if (page !== undefined) {
      query.page = page;
    }

    if (perPage !== undefined) {
      query.per_page = perPage;
    }

    if (sortField) {
      query.sort_field = sortField;
    }

    if (sortDirection) {
      query.sort_direction = sortDirection;
    }

    if (maxStaleHours !== undefined) {
      query.max_stale_hours = maxStaleHours;
    }

    const path = ENDPOINT_ASSETS_ROUTES.SOFTWARE_INVENTORY.replace('{host_id}', hostId);
    const response = await http.get<SoftwareInventoryResponse>(path, {
      query,
      version: API_VERSIONS.public.v1,
    });

    return response;
  }, [services, hostId, search, type, page, perPage, sortField, sortDirection, maxStaleHours]);

  const queryKey = [
    QUERY_KEY,
    hostId,
    search,
    type,
    page,
    perPage,
    sortField,
    sortDirection,
    maxStaleHours,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: fetchSoftwareInventory,
    enabled: !!hostId,
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
