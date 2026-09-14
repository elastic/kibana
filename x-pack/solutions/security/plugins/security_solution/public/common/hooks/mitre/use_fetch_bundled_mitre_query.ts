/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { MitreEntitySummaryBuckets, MitreEntityType } from '@kbn/security-mitre-attack-common';
import { transformLegacyMitreData } from '../../../../common/detection_engine/mitre/mitre_data_adapter';

export const LEGACY_BUNDLED_MITRE_QUERY_KEY = (types?: MitreEntityType[]) =>
  ['LAZY_BLOB', 'mitre_tactics_techniques', types?.join(',') ?? null] as const;

// MITRE reference data is static per Kibana process, so it never goes stale within a
// session. retry: false ensures the UI error state surfaces immediately on failure
// rather than silently retrying.
const DEFAULT_OPTIONS = {
  staleTime: Infinity,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

/**
 * Serves the legacy bundled `mitre_tactics_techniques.ts` blob as the feature-flag-off
 * fallback. Goes away when that blob is removed. Consumers should use
 * `useMitreConfiguration()` instead of calling this hook directly.
 */
export const useFetchLegacyMitreQuery = (
  types?: MitreEntityType[],
  options?: Pick<UseQueryOptions<MitreEntitySummaryBuckets>, 'enabled' | 'onError'>
) => {
  return useQuery<MitreEntitySummaryBuckets>(
    LEGACY_BUNDLED_MITRE_QUERY_KEY(types),
    async () => {
      const module = await import(
        /* webpackChunkName: "lazy_mitre_configuration" */
        '../../../../common/detection_engine/mitre/mitre_tactics_techniques'
      );
      const allBuckets = transformLegacyMitreData({
        tactics: module.tactics,
        techniques: module.techniques,
        subtechniques: module.subtechniques,
      });
      if (!types) {
        return allBuckets;
      }
      return {
        tactics: types.includes('tactic') ? allBuckets.tactics : [],
        techniques: types.includes('technique') ? allBuckets.techniques : [],
        subtechniques: types.includes('subtechnique') ? allBuckets.subtechniques : [],
      };
    },
    {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  );
};
