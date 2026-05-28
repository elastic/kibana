/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Dotted `_source` path for persisted AI summaries on entity documents. */
export const ENTITY_ATTRIBUTES_SUMMARY_SOURCE_PATH = 'entity.attributes.summary';

/**
 * Builds Elasticsearch `_source` filtering for entity list/search requests.
 * By default excludes AI summary blobs; pass `includeSummary: true` for detail views.
 */
export function buildEntityListSourceFilter(params: {
  includeSummary?: boolean;
  sourceIncludes?: string[];
}): { _source?: string[]; _source_excludes?: string[] } {
  if (params.includeSummary) {
    return params.sourceIncludes?.length ? { _source: params.sourceIncludes } : {};
  }

  const sourceExcludes = [ENTITY_ATTRIBUTES_SUMMARY_SOURCE_PATH];
  if (params.sourceIncludes?.length) {
    return { _source: params.sourceIncludes, _source_excludes: sourceExcludes };
  }

  return { _source_excludes: sourceExcludes };
}
