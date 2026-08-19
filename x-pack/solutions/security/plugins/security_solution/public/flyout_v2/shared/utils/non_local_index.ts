/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';

/**
 * Qualifies an index name recorded inside a document (e.g. `kibana.alert.ancestors[].index`) with
 * the cross-cluster / cross-project alias of the document that contains it.
 */
export const getNonLocalQualifiedIndex = (index: string, documentIndex: string): string => {
  if (!index || isNonLocalIndexName(index) || !isNonLocalIndexName(documentIndex)) {
    return index;
  }
  const separatorIndex = documentIndex.indexOf(':');
  return `${documentIndex.slice(0, separatorIndex + 1)}${index}`;
};

/**
 * Prepends a project-qualified document `_index` (`alias:index`) so entity lookup can pick the
 * clicked document when the same `_id` exists in more than one project.
 *
 * Origin-only names — including hidden alert backing indices such as `.internal.alerts-*` — are
 * left unchanged. Searching those from the flyout is unauthorized for the request user and surfaces
 * as Analyzer's "this alert from being analyzed" error.
 */
export const withDocumentIndex = (indices: string[], documentIndex?: string | null): string[] => {
  if (!documentIndex || !isNonLocalIndexName(documentIndex) || indices.includes(documentIndex)) {
    return indices;
  }

  return [documentIndex, ...indices];
};
