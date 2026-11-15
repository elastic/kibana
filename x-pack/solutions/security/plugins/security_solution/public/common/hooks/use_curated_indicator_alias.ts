/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../common/constants';
import { READINESS_API_PATH, type ReadinessResponse } from '../../../common/threat_intel';
import { useKibana, useUiSetting$ } from '../lib/kibana';

const READINESS_STALE_TIME_MS = 5 * 60 * 1000;

interface CuratedIndicatorAlias {
  /** The space's curated indicator alias, or undefined when the supply pipeline is off or blocked. */
  indicatorAlias: string | undefined;
  isLoading: boolean;
}

/**
 * Reads the curated indicator alias for the current space from the threat intel
 * readiness route. The route only exists when the supply pipeline is enabled, so
 * any failure resolves to "no alias" and callers fall back to `logs-ti_*` alone.
 */
export const useCuratedIndicatorAlias = (): CuratedIndicatorAlias => {
  const { http } = useKibana().services;
  const { data, isLoading } = useQuery(
    ['GET', READINESS_API_PATH],
    ({ signal }) => http.get<ReadinessResponse>(READINESS_API_PATH, { version: '1', signal }),
    { retry: false, refetchOnWindowFocus: false, staleTime: READINESS_STALE_TIME_MS }
  );

  const indicatorAlias = data && data.status !== 'blocked' ? data.indicatorAlias : undefined;
  return { indicatorAlias, isLoading };
};

/** The `securitySolution:defaultThreatIndex` setting, plus the curated alias when there is one. */
export const useDefaultThreatIndices = (): CuratedIndicatorAlias & { threatIndices: string[] } => {
  const [configuredIndices] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const { indicatorAlias, isLoading } = useCuratedIndicatorAlias();

  const threatIndices = useMemo(
    () => (indicatorAlias ? [...configuredIndices, indicatorAlias] : configuredIndices),
    [configuredIndices, indicatorAlias]
  );
  return { threatIndices, indicatorAlias, isLoading };
};
