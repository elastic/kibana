/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sortBy from 'lodash/fp/sortBy';
import { DataQualityCheckResult, ErrorSummary, PatternRollup } from '../../../types';

export const getErrorSummary = ({
  error,
  indexName,
  pattern,
}: DataQualityCheckResult): ErrorSummary => ({
  error: String(error),
  indexName,
  pattern,
});

export const getErrorSummariesForRollup = (
  patternRollup: PatternRollup | undefined
): ErrorSummary[] => {
  const maybePatternErrorSummary: ErrorSummary[] =
    patternRollup != null && patternRollup.error != null
      ? [{ pattern: patternRollup.pattern, indexName: null, error: patternRollup.error }]
      : [];

  if (patternRollup != null && patternRollup.results != null) {
    const unsortedResults: DataQualityCheckResult[] = Object.values(patternRollup.results);
    const sortedResults = sortBy('indexName', unsortedResults);

    return sortedResults.reduce<ErrorSummary[]>(
      (acc, result) => [...acc, ...(result.error != null ? [getErrorSummary(result)] : [])],
      maybePatternErrorSummary
    );
  } else {
    return maybePatternErrorSummary;
  }
};

export const getErrorSummaries = (
  patternRollups: Record<string, PatternRollup>
): ErrorSummary[] => {
  const allPatterns: string[] = Object.keys(patternRollups);

  // sort the patterns A-Z:
  const sortedPatterns = [...allPatterns].sort((a, b) => {
    return a.localeCompare(b);
  });

  return sortedPatterns.reduce<ErrorSummary[]>(
    (acc, pattern) => [...acc, ...getErrorSummariesForRollup(patternRollups[pattern])],
    []
  );
};
