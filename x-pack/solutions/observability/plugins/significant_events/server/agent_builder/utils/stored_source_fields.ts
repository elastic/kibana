/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftSourceSlugsField } from '@kbn/nightshift-shared';
import {
  presentSlug,
  resolveSourcesBySlug,
  UnknownSourceSlugError,
  type SourceCatalog,
} from './resolve_source_slugs';

/** Tool input for the stored `stream_names` field. Values are source slugs. */
export const sourceSlugsSchema = nightshiftSourceSlugsField('Disabled sources are accepted.');

interface NestedStreamName {
  stream_name?: string;
}

interface SlugScopedEvent {
  slugs: readonly string[];
  signals?: ReadonlyArray<NestedStreamName>;
  causal_features?: ReadonlyArray<NestedStreamName>;
  blast_radius?: ReadonlyArray<NestedStreamName>;
}

interface StoredStreamNames {
  stream_names: readonly string[];
  signals?: ReadonlyArray<NestedStreamName>;
  causal_features?: ReadonlyArray<NestedStreamName>;
  blast_radius?: ReadonlyArray<NestedStreamName>;
}

const nestedSlugs = (entries: ReadonlyArray<NestedStreamName> | undefined): string[] =>
  (entries ?? []).flatMap((entry) => (entry.stream_name === undefined ? [] : [entry.stream_name]));

const rewriteNested = <T extends NestedStreamName>(
  entries: readonly T[],
  mapName: (name: string) => string
): T[] =>
  entries.map((entry) =>
    entry.stream_name === undefined ? entry : { ...entry, stream_name: mapName(entry.stream_name) }
  );

/**
 * Copies resolved source ids into the stored `stream_names` and nested
 * `stream_name` keys. This is the only assignment site; a later rename of
 * those keys happens here.
 */
export function assignStoredSourceIds<T extends SlugScopedEvent>(
  catalog: SourceCatalog,
  item: T
): Omit<T, 'slugs'> & { stream_names: string[] } {
  resolveSourcesBySlug(catalog, [
    ...item.slugs,
    ...nestedSlugs(item.signals),
    ...nestedSlugs(item.causal_features),
    ...nestedSlugs(item.blast_radius),
  ]);
  const idOf = (slug: string): string => {
    const source = catalog.bySlug.get(slug);
    if (!source) {
      throw new UnknownSourceSlugError([slug]);
    }
    return source.id;
  };

  const { slugs: _slugs, ...rest } = item;

  return {
    ...rest,
    stream_names: item.slugs.map(idOf),
    ...(item.signals ? { signals: rewriteNested(item.signals, idOf) } : {}),
    ...(item.causal_features ? { causal_features: rewriteNested(item.causal_features, idOf) } : {}),
    ...(item.blast_radius ? { blast_radius: rewriteNested(item.blast_radius, idOf) } : {}),
  };
}

/**
 * Shows stored source ids as slugs on `stream_names` and nested `stream_name`.
 * An id missing from the catalog is left unchanged.
 */
export function presentStoredSourceFields<T extends StoredStreamNames>(
  catalog: SourceCatalog,
  item: T
): T {
  const show = (storedId: string) => presentSlug(catalog, storedId);
  return {
    ...item,
    stream_names: item.stream_names.map(show),
    ...(item.signals ? { signals: rewriteNested(item.signals, show) } : {}),
    ...(item.causal_features ? { causal_features: rewriteNested(item.causal_features, show) } : {}),
    ...(item.blast_radius ? { blast_radius: rewriteNested(item.blast_radius, show) } : {}),
  };
}
