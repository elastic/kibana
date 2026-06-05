/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts available index patterns from a user query that contains an
 * "Available data:" line (injected by the eval harness or UI).
 *
 * Example:
 *   Input:  "...\n\nAvailable data: logs-endpoint.events.*"
 *   Output: ["logs-endpoint.events.*"]
 */
export const extractAvailableIndices = (userQuery: string): string[] => {
  // Match "Available data:" followed by index pattern(s), supporting
  // comma-separated lists and wildcard ranges like logs-okta.system*.
  const match = userQuery.match(/Available data:\s*([^\n]+)/i);
  if (!match) return [];

  return match[1]
    .split(/,| and /i)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Extracts the index pattern from an ES|QL query's FROM clause.
 *
 * Example:
 *   Input:  "FROM logs-endpoint.events.* metadata _id ..."
 *   Output: "logs-endpoint.events.*"
 */
export const extractFromIndex = (query: string): string | null => {
  const match = query.match(/FROM\s+(\S+)/i);
  return match ? match[1] : null;
};

/**
 * Checks whether a generated query's FROM index is compatible with the
 * available index patterns.
 *
 * Rules:
 * - If no available indices are known, allow the query (no mismatch can be
 *   proven).
 * - If the generated query uses a broad wildcard (e.g. logs-*), allow it.
 * - If the FROM index is a literal prefix of any available pattern, allow it.
 * - If any available pattern is a prefix of the FROM index, allow it.
 * - Otherwise, it's a mismatch.
 */
export const isQueryCompatibleWithAvailableData = (
  query: string,
  availableIndices: string[]
): boolean => {
  if (availableIndices.length === 0) return true;

  const fromIndex = extractFromIndex(query);
  if (!fromIndex) return false;

  // Broad wildcards are always allowed (the model is trying to be generic)
  if (fromIndex.endsWith('*') && fromIndex.split('.').length <= 2) {
    return true;
  }

  for (const available of availableIndices) {
    const a = available.toLowerCase();
    const f = fromIndex.toLowerCase();

    // Direct match or one is a prefix of the other
    if (a === f || a.startsWith(f) || f.startsWith(a)) return true;

    // Handle wildcard overlap: logs-endpoint.events.* matches
    // logs-endpoint.events.process-*
    const aBase = a.replace(/\*+$/, '');
    const fBase = f.replace(/\*+$/, '');
    if (aBase.startsWith(fBase) || fBase.startsWith(aBase)) return true;
  }

  return false;
};
