/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Combines an index name with integration namespaces.
 *
 * @param indexName - The base index name (must end with ".*" or "-*")
 * @param integrationNamespaces - Object containing integration names as keys and namespace arrays as values
 * @param integrationName - The integration name to look up in the integrationNamespaces object (e.g., "endpoint")
 * @returns Combined index names with namespaces, multiple indices separated by commas. Returns empty string if validation fails.
 */

export function combineIndexWithNamespaces(
  indexName: string,
  integrationNamespaces: Record<string, string[]>,
  integrationName: string
): string {
  // Validate that index ends with .* or -*
  if (!indexName.endsWith('.*') && !indexName.endsWith('-*')) {
    return '';
  }

  const namespaces = integrationNamespaces[integrationName];

  // Return empty string if integration doesn't exist or has no namespaces
  if (!namespaces || namespaces.length === 0) {
    return '';
  }

  const indexPatterns = namespaces.map((namespace) => {
    // If the index ends with '-*', replace the '*' with the namespace
    if (indexName.endsWith('-*')) {
      return indexName.slice(0, -1) + namespace;
    }
    // Otherwise, append the namespace after the last dash
    return `${indexName}-${namespace}`;
  });

  return indexPatterns.join(',');
}
