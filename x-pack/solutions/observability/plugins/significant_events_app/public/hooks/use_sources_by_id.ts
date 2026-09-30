/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useFetchSources } from './use_fetch_sources';

const EMPTY_SOURCES_BY_ID = new Map<string, NightshiftSource>();

// Module-level so react-query keeps the same Map until the source list changes.
const toSourcesById = (sources: NightshiftSource[]) =>
  new Map(sources.map((source) => [source.id, source]));

/**
 * Looks sources up by id. `getSourceTitle` falls back to the raw value, because detections and
 * events written before the source cutover still carry stream names.
 */
export function useSourcesById(): {
  sourcesById: Map<string, NightshiftSource>;
  getSourceTitle: (sourceId: string) => string;
} {
  const { data: sourcesById = EMPTY_SOURCES_BY_ID } = useFetchSources({
    select: toSourcesById,
    showErrorToast: false,
  });

  return {
    sourcesById,
    getSourceTitle: (sourceId) => sourcesById.get(sourceId)?.title ?? sourceId,
  };
}
