/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchSources } from './use_fetch_sources';

interface SourcesLookup {
  sourcesById: Map<string, NightshiftSource>;
  /** The source title, or the raw value for ids that are not in the catalog. */
  getSourceTitle: (sourceId: string) => string;
}

// Module-level so react-query keeps one lookup, and one `getSourceTitle`, until the source list
// changes. Memoized columns can then depend on `getSourceTitle` without rebuilding every render.
const toSourcesLookup = (sources: NightshiftSource[]): SourcesLookup => {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  return {
    sourcesById,
    getSourceTitle: (sourceId) => sourcesById.get(sourceId)?.title ?? sourceId,
  };
};

const EMPTY_SOURCES_LOOKUP = toSourcesLookup([]);

/**
 * Looks sources up by id. `getSourceTitle` falls back to the raw value when the id is not in the
 * catalog, including a source that has been deleted.
 */
export function useSourcesById(): SourcesLookup & { isError: boolean } {
  const { data = EMPTY_SOURCES_LOOKUP, isError } = useFetchSources({
    select: toSourcesLookup,
    showErrorToast: true,
  });
  return { ...data, isError };
}
