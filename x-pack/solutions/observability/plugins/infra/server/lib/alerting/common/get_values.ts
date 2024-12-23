/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getEvaluationValues = <T extends { currentValue: number | null }>(
  alertResults: Array<Record<string, T>>,
  group: string
): Array<number | null> => {
  return alertResults.reduce((acc: Array<number | null>, result) => {
    if (result[group]) {
      acc.push(result[group].currentValue);
    }
    return acc;
  }, []);
};

export const getThresholds = <T extends { threshold: number[] }>(
  criteria: T[]
): number[] | undefined => {
  let hasMultipleThresholdComparator = false;
  const thresholds = criteria
    .map((c) => c.threshold)
    .reduce((acc: number[], t) => {
      if (t.length !== 1) {
        hasMultipleThresholdComparator = true;
        return acc;
      }
      return acc.concat(t[0]);
    }, []);

  // We don't save threshold if at least one of the comparators is a multiple threshold one such as 'in between'
  if (hasMultipleThresholdComparator) return undefined;

  return thresholds;
};
