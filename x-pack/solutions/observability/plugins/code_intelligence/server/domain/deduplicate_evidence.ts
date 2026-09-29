/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceLocation } from './source_location_codec';

/**
 * Returns source locations sorted by path and line, with one location per source line.
 */
export const deduplicateEvidence = (locations: readonly SourceLocation[]): SourceLocation[] => {
  /** Keeps the latest evidence for each repository path and line. */
  const uniqueLocations = new Map<string, SourceLocation>();

  for (const location of locations) {
    uniqueLocations.set(`${location.path}:${location.line}`, location);
  }

  return [...uniqueLocations.values()].sort(
    (left, right) => left.path.localeCompare(right.path) || left.line - right.line
  );
};
