/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';

import { isEqual } from 'lodash/fp';
import { MeteringStatsIndex } from '../../../../types';

export const shouldCreateIndexNames = ({
  ilmExplain,
  indexNames,
  isILMAvailable,
  newIndexNames,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[] | undefined;
  isILMAvailable: boolean;
  newIndexNames: string[];
  stats: Record<string, MeteringStatsIndex> | null;
}): boolean => {
  return (
    !isEqual(newIndexNames, indexNames) &&
    stats != null &&
    ((isILMAvailable && ilmExplain != null) || !isILMAvailable)
  );
};
