/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const generateIndexNamesWithWildcards = (fullIndexNames: string[]): string[] => {
  const result = new Set(fullIndexNames);
  const partsList = fullIndexNames.map((str) => str.split('.'));
  const occurrences = new Map();
  /* eslint-disable no-bitwise */
  for (const parts of partsList) {
    for (let mask = 1; mask < 1 << parts.length; mask++) { 
      const wildcardVersion = parts.map((part, idx) => (mask & (1 << idx) ? '*' : part)); 
      const wildcardStr = wildcardVersion.join('.');
      occurrences.set(wildcardStr, (occurrences.get(wildcardStr) || 0) + 1);
    }
  }
  /* eslint-enable no-bitwise */


  for (const [wildcardStr, count] of occurrences.entries()) {
    if (count > 1) {
      result.add(wildcardStr);
    }
  }

  return Array.from(result).slice(0, fullIndexNames.length * 3);
};
