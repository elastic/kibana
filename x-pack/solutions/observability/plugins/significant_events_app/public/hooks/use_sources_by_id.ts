/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchSources } from './use_fetch_sources';

const DELETED_SOURCE_LABEL = i18n.translate('xpack.significantEventsApp.sources.deletedSource', {
  defaultMessage: 'Deleted source',
});

interface SourcesLookup {
  sourcesById: Map<string, NightshiftSource>;
  /**
   * The source title. An id missing from a loaded catalog is a deleted source and gets a
   * placeholder. Before the catalog loads, or when it failed to load, the raw value is returned so
   * live sources are not mislabelled as deleted.
   */
  getSourceTitle: (sourceId: string) => string;
}

// Module-level so react-query keeps one lookup, and one `getSourceTitle`, until the source list
// changes. Memoized columns can then depend on `getSourceTitle` without rebuilding every render.
const toSourcesLookup = (sources: NightshiftSource[]): SourcesLookup => {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  return {
    sourcesById,
    getSourceTitle: (sourceId) => sourcesById.get(sourceId)?.title ?? DELETED_SOURCE_LABEL,
  };
};

const NOT_LOADED_SOURCES_LOOKUP: SourcesLookup = {
  sourcesById: new Map(),
  getSourceTitle: (sourceId) => sourceId,
};

/**
 * Looks sources up by id. `getSourceTitle` labels an id missing from the loaded catalog as a
 * deleted source.
 */
export function useSourcesById(): SourcesLookup & { isError: boolean } {
  const { data = NOT_LOADED_SOURCES_LOOKUP, isError } = useFetchSources({
    select: toSourcesLookup,
    showErrorToast: true,
  });
  return { ...data, isError };
}
