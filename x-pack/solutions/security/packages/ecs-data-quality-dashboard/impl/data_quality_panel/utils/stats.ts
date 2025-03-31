/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataQualityCheckResult, MeteringStatsIndex, PatternRollup } from '../types';

export const getIndexIncompatible = ({
  indexName,
  results,
}: {
  indexName: string;
  results: Record<string, DataQualityCheckResult> | undefined;
}): number | undefined => {
  if (results == null || results[indexName] == null) {
    return undefined;
  }

  return results[indexName].incompatible;
};

export const getSizeInBytes = ({
  indexName,
  stats,
}: {
  indexName: string;
  stats: Record<string, MeteringStatsIndex> | null;
}): number | undefined => (stats && stats[indexName]?.size_in_bytes) ?? undefined;

export const getDocsCount = ({
  indexName,
  stats,
}: {
  indexName: string;
  stats: Record<string, MeteringStatsIndex> | null;
}): number => (stats && stats[indexName]?.num_docs) ?? 0;

export const getTotalPatternIndicesChecked = (patternRollup: PatternRollup | undefined): number => {
  if (patternRollup != null && patternRollup.results != null) {
    const allResults = Object.values(patternRollup.results);
    const nonErrorResults = allResults.filter(({ error }) => error == null);

    return nonErrorResults.length;
  } else {
    return 0;
  }
};

export const getTotalPatternIncompatible = (
  results: Record<string, DataQualityCheckResult> | undefined
): number | undefined => {
  if (results == null) {
    return undefined;
  }

  const allResults = Object.values(results);

  return allResults.reduce<number>((acc, { incompatible }) => acc + (incompatible ?? 0), 0);
};

export const getDocsCountPercent = ({
  docsCount,
  locales,
  patternDocsCount,
}: {
  docsCount: number;
  locales?: string | string[];
  patternDocsCount: number;
}): string =>
  patternDocsCount !== 0
    ? Number(docsCount / patternDocsCount).toLocaleString(locales, {
        style: 'percent',
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : '';
