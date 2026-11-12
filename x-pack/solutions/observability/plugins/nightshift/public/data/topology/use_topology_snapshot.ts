/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { TopologySnapshotProperties } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { TOPOLOGY_QUERY_KEY } from '../query_keys';

export const topologyQueryKey = (sourceIds: string[]) =>
  [...TOPOLOGY_QUERY_KEY, ...sourceIds] as const;

/** Fetches a topology snapshot for selected sources, or all readable sources when none are selected. */
export const useTopologySnapshot = (sourceIds: string[], enabled = true) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const sortedSourceIds = useMemo(() => [...sourceIds].sort(), [sourceIds]);

  return useQuery<TopologySnapshotProperties, Error>({
    queryKey: topologyQueryKey(sortedSourceIds),
    enabled,
    queryFn: ({ signal }) =>
      significantEventsRepositoryClient.fetch('GET /internal/nightshift/topology', {
        signal: signal ?? null,
        ...(sortedSourceIds.length > 0
          ? { params: { query: { sourceIds: sortedSourceIds } } }
          : {}),
      }),
  });
};
