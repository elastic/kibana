/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';

import { MeteringStatsIndex, PatternRollup } from '../../../../types';

export const shouldCreatePatternRollup = ({
  error,
  ilmExplain,
  isILMAvailable,
  newDocsCount,
  patternRollup,
  stats,
}: {
  error: string | null;
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  isILMAvailable: boolean;
  newDocsCount: number;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
}): boolean => {
  if (patternRollup?.docsCount === newDocsCount) {
    return false;
  }

  const allDataLoaded: boolean =
    stats != null && ((isILMAvailable && ilmExplain != null) || !isILMAvailable);
  const errorOccurred: boolean = error != null;

  return allDataLoaded || errorOccurred;
};
