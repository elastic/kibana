/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { useKibana } from '../../hooks/use_kibana';
import { toFeatureAvailability, type FeatureAvailability } from '../feature_availability';
import type { KnowledgeTabsAvailability } from '../knowledge_tabs';

const cortexAvailabilityKey = ['cortex', 'availability'] as const;
const memoryAvailabilityKey = ['nightshift', 'memory', 'availability'] as const;
const decisionTreesAvailabilityKey = ['decision_trees', 'availability'] as const;

export const useCortexEnabled = (enabled = true): FeatureAvailability => {
  const client = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return toFeatureAvailability(
    useQuery({
      queryKey: cortexAvailabilityKey,
      queryFn: ({ signal }) => {
        if (client === undefined) {
          return { enabled: false };
        }
        return client.fetch('GET /internal/nightshift/cortex/availability', {
          signal: signal ?? null,
        });
      },
      enabled: enabled && client !== undefined,
      retry: false,
    })
  );
};

export const useMemoryEnabled = (enabled = true): FeatureAvailability => {
  const client = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return toFeatureAvailability(
    useQuery({
      queryKey: memoryAvailabilityKey,
      queryFn: ({ signal }) => {
        if (client === undefined) {
          return { enabled: false };
        }
        return client.fetch('GET /internal/nightshift/memory/availability', {
          signal: signal ?? null,
        });
      },
      enabled: enabled && client !== undefined,
      retry: false,
    })
  );
};

export const useDecisionTreesEnabled = (enabled = true): FeatureAvailability => {
  const { http } = useKibana().services;

  return toFeatureAvailability(
    useQuery({
      queryKey: decisionTreesAvailabilityKey,
      queryFn: ({ signal }) =>
        http.get<{ enabled: boolean }>('/internal/nightshift/decision_trees/availability', {
          signal,
        }),
      enabled,
      retry: false,
    })
  );
};

interface UseKnowledgeTabsAvailabilityOptions {
  enabled?: boolean;
}

export const useKnowledgeTabsAvailability = ({
  enabled = true,
}: UseKnowledgeTabsAvailabilityOptions = {}): KnowledgeTabsAvailability => {
  const { isDeveloperMode } = useDeveloperMode();
  const decisionTrees = useDecisionTreesEnabled(enabled && isDeveloperMode);

  return {
    // KIs are always available; only the optional tabs below have gates.
    knowledge_indicators: { isEnabled: true, isLoading: false },
    cortex: useCortexEnabled(enabled),
    memory: useMemoryEnabled(enabled),
    // A disabled query still returns its cached data, so mask it explicitly.
    decision_trees: isDeveloperMode ? decisionTrees : { isEnabled: false, isLoading: false },
  };
};
