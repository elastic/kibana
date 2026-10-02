/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftSourceSlugsField } from '@kbn/nightshift-shared';
import {
  findSource,
  presentSlug,
  resolveSourcesBySlug,
  type SourceCatalog,
} from './resolve_source_slugs';

/** Tool input for the stored `source_ids` field. Values are source slugs. */
export const sourceSlugsSchema = nightshiftSourceSlugsField('Disabled sources are accepted.');

interface NestedSourceId {
  source_id?: string;
}

interface SlugScopedEvent {
  slugs: readonly string[];
  signals?: ReadonlyArray<NestedSourceId>;
  causal_features?: ReadonlyArray<NestedSourceId>;
  blast_radius?: ReadonlyArray<NestedSourceId>;
}

interface StoredSourceIds {
  source_ids: readonly string[];
  signals?: ReadonlyArray<NestedSourceId>;
  causal_features?: ReadonlyArray<NestedSourceId>;
  blast_radius?: ReadonlyArray<NestedSourceId>;
}

const rewriteNested = <T extends NestedSourceId>(
  entries: readonly T[],
  mapName: (name: string) => string
): T[] =>
  entries.map((entry) =>
    entry.source_id === undefined ? entry : { ...entry, source_id: mapName(entry.source_id) }
  );

/**
 * Copies resolved source ids into the stored `source_ids` and nested
 * `source_id` keys. This is the only assignment site.
 *
 * Only `slugs` must resolve. A nested value that matches no source is kept as
 * is: continuing a stored event must not fail the batch.
 */
export function assignStoredSourceIds<T extends SlugScopedEvent>(
  catalog: SourceCatalog,
  item: T
): Omit<T, 'slugs'> & { source_ids: string[] } {
  const { slugs, ...rest } = item;
  const idOf = (slugOrId: string): string => findSource(catalog, slugOrId)?.id ?? slugOrId;

  return {
    ...rest,
    source_ids: resolveSourcesBySlug(catalog, slugs).map((source) => source.id),
    ...(item.signals ? { signals: rewriteNested(item.signals, idOf) } : {}),
    ...(item.causal_features ? { causal_features: rewriteNested(item.causal_features, idOf) } : {}),
    ...(item.blast_radius ? { blast_radius: rewriteNested(item.blast_radius, idOf) } : {}),
  };
}

/**
 * Shows stored source ids as slugs on `source_ids` and nested `source_id`.
 * An id missing from the catalog is left unchanged.
 */
export function presentStoredSourceFields<T extends StoredSourceIds>(
  catalog: SourceCatalog,
  item: T
): T {
  const show = (storedId: string) => presentSlug(catalog, storedId);
  return {
    ...item,
    source_ids: item.source_ids.map(show),
    ...(item.signals ? { signals: rewriteNested(item.signals, show) } : {}),
    ...(item.causal_features ? { causal_features: rewriteNested(item.causal_features, show) } : {}),
    ...(item.blast_radius ? { blast_radius: rewriteNested(item.blast_radius, show) } : {}),
  };
}
