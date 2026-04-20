/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetCompositeSLOResponse } from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export function useFetchCompositeSloDetails(ids: string[]) {
  const { sloClient } = usePluginContext();
  const sortedIds = useMemo(() => [...ids].sort(), [ids]);

  const { data, isInitialLoading: isLoading } = useQuery({
    queryKey: [...sloKeys.compositeDetails(), sortedIds],
    queryFn: async ({ signal }) => {
      if (sortedIds.length === 0) return [];
      return await sloClient.fetch('POST /internal/observability/slo_composites/_batch_get', {
        params: { body: { ids: sortedIds } },
        signal,
      });
    },
    enabled: sortedIds.length > 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const detailsById = useMemo(() => {
    const map = new Map<string, GetCompositeSLOResponse>();
    if (data) {
      for (const item of data) {
        map.set(item.id, item as GetCompositeSLOResponse);
      }
    }
    return map;
  }, [data]);

  return { detailsById, isLoading };
}
