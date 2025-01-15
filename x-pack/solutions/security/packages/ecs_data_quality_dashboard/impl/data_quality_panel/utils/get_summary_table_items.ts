/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import { orderBy } from 'lodash/fp';

import { DataQualityCheckResult, IndexSummaryTableItem, MeteringStatsIndex } from '../types';
import { getIlmPhase } from './get_ilm_phase';
import { getDocsCount, getIndexIncompatible, getSizeInBytes } from './stats';

export const getSummaryTableItems = ({
  ilmExplain,
  indexNames,
  isILMAvailable,
  pattern,
  patternDocsCount,
  results,
  sortByColumn,
  sortByDirection,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[];
  isILMAvailable: boolean;
  pattern: string;
  patternDocsCount: number;
  results: Record<string, DataQualityCheckResult> | undefined;
  sortByColumn: string;
  sortByDirection: 'desc' | 'asc';
  stats: Record<string, MeteringStatsIndex> | null;
}): IndexSummaryTableItem[] => {
  const summaryTableItems = indexNames.map((indexName) => ({
    docsCount: getDocsCount({ stats, indexName }),
    incompatible: getIndexIncompatible({ indexName, results }),
    indexName,
    ilmPhase:
      isILMAvailable && ilmExplain != null
        ? getIlmPhase(ilmExplain[indexName], isILMAvailable)
        : undefined,
    pattern,
    patternDocsCount,
    sizeInBytes: getSizeInBytes({ stats, indexName }),
    checkedAt: results?.[indexName]?.checkedAt,
  }));

  return orderBy([sortByColumn], [sortByDirection], summaryTableItems);
};
