/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useKibana } from '../../../../common/lib/kibana';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import {
  ACKNOWLEDGED,
  CLOSED,
  OPEN,
} from '../../../../attack_discovery/pages/results/history/search_and_filter/translations';

// No start/end: queries all time, matching the same scope the rest of the value
// report uses. Only fires when the selected range is empty (enabled gate), so
// this runs at most once before the report decides to show sample data.
const ALL_STATUSES = [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase());

interface UseHasEverUsedAttackDiscovery {
  hasEverUsedAttackDiscovery: boolean;
  isLoading: boolean;
}

interface Options {
  enabled?: boolean;
}

export const useHasEverUsedAttackDiscovery = ({
  enabled = true,
}: Options = {}): UseHasEverUsedAttackDiscovery => {
  const { http } = useKibana().services;
  const { assistantAvailability } = useAssistantContext();
  const shouldQueryHistory = assistantAvailability.isAssistantEnabled && enabled;

  const { data, isLoading } = useFindAttackDiscoveries({
    http,
    isAssistantEnabled: shouldQueryHistory,
    perPage: 1,
    status: ALL_STATUSES,
  });

  return useMemo(
    () => ({
      hasEverUsedAttackDiscovery: shouldQueryHistory ? (data?.total ?? 0) > 0 : false,
      isLoading: shouldQueryHistory && isLoading,
    }),
    [data?.total, isLoading, shouldQueryHistory]
  );
};
