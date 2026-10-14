/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RerouteDatasetResult {
  dataset: string;
  resolvedFromPattern: boolean;
}

// Captures `<dataset>` from a `<type>-<dataset>-*` pattern that matches any namespace,
// e.g. `logs-nginx.access-*` or `logs-claude_cowork.events.otel-*`.
const ROUTABLE_INDEX_PATTERN = /^[a-z]+-([^-*.][^-*]*)-\*$/;

/**
 * Returns the reroute dataset for an index template, preferring its index patterns over its name.
 *
 * Template names do not always match the data streams they apply to: for OTel inputs Fleet names
 * the template `logs-<dataset>` but its pattern is `logs-<dataset>.otel-*`.
 */
export const getRerouteDataset = (
  templateName: string,
  indexPatterns: readonly string[] = []
): RerouteDatasetResult => {
  for (const pattern of indexPatterns) {
    const match = ROUTABLE_INDEX_PATTERN.exec(pattern);
    if (match) {
      return { dataset: match[1], resolvedFromPattern: true };
    }
  }

  const [, datasetFromName] = templateName.split('-');
  return { dataset: datasetFromName, resolvedFromPattern: false };
};
