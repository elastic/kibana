/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { toFeatureAvailability, type FeatureAvailability } from '../feature_availability';
import type { KnowledgeTabsAvailability } from '../knowledge_tabs';

const cortexAvailabilityKey = ['cortex', 'availability'] as const;
const memoryAvailabilityKey = ['nightshift', 'memory', 'availability'] as const;
const decisionTreesAvailabilityKey = ['decision_trees', 'availability'] as const;

export const useCortexEnabled = (): FeatureAvailability => {
  const client = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return toFeatureAvailability(
    useQuery({
      queryKey: cortexAvailabilityKey,
      queryFn: ({ signal }) =>
        client!.fetch('GET /internal/nightshift/cortex/availability', { signal: signal ?? null }),
      enabled: client !== undefined,
      retry: false,
    })
  );
};

export const useMemoryEnabled = (): FeatureAvailability => {
  const client = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return toFeatureAvailability(
    useQuery({
      queryKey: memoryAvailabilityKey,
      queryFn: ({ signal }) =>
        client!.fetch('GET /internal/nightshift/memory/availability', { signal: signal ?? null }),
      enabled: client !== undefined,
      retry: false,
    })
  );
};

export const useDecisionTreesEnabled = (): FeatureAvailability => {
  const { http } = useKibana().services;

  return toFeatureAvailability(
    useQuery({
      queryKey: decisionTreesAvailabilityKey,
      queryFn: ({ signal }) =>
        http.get<{ enabled: boolean }>('/internal/nightshift/decision_trees/availability', {
          signal,
        }),
      retry: false,
    })
  );
};

export const useKnowledgeTabsAvailability = (): KnowledgeTabsAvailability => ({
  cortex: useCortexEnabled(),
  memory: useMemoryEnabled(),
  decision_trees: useDecisionTreesEnabled(),
});
