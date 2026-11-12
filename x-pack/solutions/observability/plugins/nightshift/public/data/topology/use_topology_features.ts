/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { Feature, TopologyProvenance } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { TOPOLOGY_QUERY_KEY } from '../query_keys';

export const useTopologyFeatures = (provenance: TopologyProvenance[]) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const { sourceIds, featureUuids } = useMemo(
    () => ({
      sourceIds: [...new Set(provenance.map(({ source_id: sourceId }) => sourceId))].sort(),
      featureUuids: provenance.map(({ feature_uuid: uuid }) => uuid).sort(),
    }),
    [provenance]
  );

  return useQuery<{ features: Feature[] }, Error>({
    queryKey: [...TOPOLOGY_QUERY_KEY, 'features', ...featureUuids],
    enabled: featureUuids.length > 0,
    queryFn: ({ signal }) =>
      significantEventsRepositoryClient.fetch('GET /internal/nightshift/topology/features', {
        signal: signal ?? null,
        params: { query: { sourceIds, featureUuids } },
      }),
  });
};
