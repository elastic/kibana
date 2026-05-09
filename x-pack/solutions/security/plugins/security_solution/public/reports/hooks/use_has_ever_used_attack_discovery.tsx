/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useKibana } from '../../common/lib/kibana';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';
import {
  ACKNOWLEDGED,
  CLOSED,
  OPEN,
} from '../../attack_discovery/pages/results/history/search_and_filter/translations';

// Query a window wide enough to mean "ever" so the report can distinguish
// "no discoveries in the selected range" from "the feature has never been used".
const EVER_START = 'now-2y';
const EVER_END = 'now';

const ALL_STATUSES = [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase());

interface UseHasEverUsedAttackDiscovery {
  hasEverUsedAttackDiscovery: boolean;
  isLoading: boolean;
}

export const useHasEverUsedAttackDiscovery = (): UseHasEverUsedAttackDiscovery => {
  const { http } = useKibana().services;
  const { assistantAvailability } = useAssistantContext();

  const { data, isLoading } = useFindAttackDiscoveries({
    end: EVER_END,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    perPage: 1,
    start: EVER_START,
    status: ALL_STATUSES,
  });

  return useMemo(
    () => ({
      hasEverUsedAttackDiscovery: (data?.total ?? 0) > 0,
      isLoading,
    }),
    [data?.total, isLoading]
  );
};
