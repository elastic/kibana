/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import minimatch from 'minimatch';

/**
 * Checks if an index name matches any of the given patterns.
 * Handles both regular indices and data stream backing indices.
 */
function matchesPatterns({ index, patterns }: { index: string; patterns: string[] }): boolean {
  return patterns.some((pattern) => {
    if (minimatch(index, pattern)) {
      return true;
    }

    if (index.startsWith('.ds-') && minimatch(index, `.ds-${pattern}-*`)) {
      return true;
    }

    return false;
  });
}

/**
 * Checks if an index name matches any of the given index patterns.
 * Also handles data stream backing indices which have the format:
 * `.ds-{data-stream-name}-{date}-{generation}`
 *
 * @param index The index name (e.g., "logs-app-default" or ".ds-logs-app-default-2025.01.01-000001")
 * @param patterns Array of index patterns to match against (e.g., ["logs-*", "metrics-*"])
 * @param excludePatterns Optional array of patterns to exclude (e.g., APM indices)
 * @returns true if the index matches any pattern and doesn't match exclusions, false otherwise
 *
 * @example
 * ```ts
 * matchesIndexPattern('logs-app-default', ['logs-*']); // true
 * matchesIndexPattern('.ds-logs-app-default-2025.01.01-000001', ['logs-*']); // true
 * matchesIndexPattern('.ds-logs-apm.error-default-2025.01.01-000001', ['logs-*'], ['logs-apm.*']); // false
 * matchesIndexPattern('metrics-app-default', ['logs-*']); // false
 * ```
 */
export function matchesIndexPattern({
  index,
  patterns,
  excludePatterns,
}: {
  index: string;
  patterns: string[];
  excludePatterns?: string[];
}): boolean {
  if (excludePatterns && matchesPatterns({ index, patterns: excludePatterns })) {
    return false;
  }

  return matchesPatterns({ index, patterns });
}
