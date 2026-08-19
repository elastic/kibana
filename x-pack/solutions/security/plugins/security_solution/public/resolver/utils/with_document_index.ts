/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prepends a project-qualified document `_index` (`alias:index`) so entity lookup can pick the
 * clicked document when the same `_id` exists in more than one project.
 *
 * Origin-only names — including hidden alert backing indices such as `.internal.alerts-*` — are
 * left unchanged. Searching those from the flyout is unauthorized for the request user and surfaces
 * as Analyzer's "this alert from being analyzed" error.
 */
export const withDocumentIndex = (indices: string[], documentIndex?: string | null): string[] => {
  if (!documentIndex || !documentIndex.includes(':') || indices.includes(documentIndex)) {
    return indices;
  }

  return [documentIndex, ...indices];
};
