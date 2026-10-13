/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { StatusError } from '../../lib/errors/status_error';
import { listAllSources } from '../../routes/utils/list_all_sources';
import { filterReadableSourceIds } from '../../routes/utils/resolve_source_ids';
import { SourceDisabledError } from './source_disabled_error';

export { SourceDisabledError };

/** Slug and id indexes for one space. Built from a single catalog read. */
export interface SourceCatalog {
  readonly bySlug: ReadonlyMap<string, NightshiftSource>;
  readonly byId: ReadonlyMap<string, NightshiftSource>;
}

/**
 * A requested slug is not a source in the current space. The whole call fails;
 * unknown slugs are not dropped.
 */
export class UnknownSourceSlugError extends StatusError {
  constructor(slugs: readonly string[]) {
    super(`Source not found in this space: ${slugs.join(', ')}`, 404);
    this.name = 'UnknownSourceSlugError';
  }
}

/** Loads every source in the space, enabled or not, and indexes it both ways. */
export async function loadSourceCatalog(sourcesClient: SourcesClient): Promise<SourceCatalog> {
  const sources = await listAllSources(sourcesClient);
  return {
    bySlug: new Map(sources.map((source) => [source.slug, source])),
    byId: new Map(sources.map((source) => [source.id, source])),
  };
}

/**
 * The catalog narrowed to the sources whose data the caller can read. Stored knowledge is read as
 * the internal user, so an unscoped read has to start from this rather than the full catalog.
 */
export async function restrictCatalogToReadable(
  catalog: SourceCatalog,
  sourcesClient: SourcesClient
): Promise<SourceCatalog> {
  const readableIds = new Set(
    await filterReadableSourceIds([...catalog.byId.keys()], sourcesClient)
  );
  const readable = [...catalog.byId.values()].filter((source) => readableIds.has(source.id));
  return {
    bySlug: new Map(readable.map((source) => [source.slug, source])),
    byId: new Map(readable.map((source) => [source.id, source])),
  };
}

/**
 * Source for a slug, or for a source id. Ids win over slugs: a title-derived slug can equal
 * another source's id, and a caller passing an id never means the slug. Ids are accepted because tool results
 * and workflow inputs (the Discovery detection batch) carry stored ids, and the
 * model copies them back into writes.
 */
export function findSource(catalog: SourceCatalog, slugOrId: string): NightshiftSource | undefined {
  return catalog.byId.get(slugOrId) ?? catalog.bySlug.get(slugOrId);
}

/**
 * Resolves slugs (or source ids) to sources in the caller's order. Duplicates
 * repeat the same source. Throws {@link UnknownSourceSlugError} if any is missing.
 */
export function resolveSourcesBySlug(
  catalog: SourceCatalog,
  slugs: readonly string[]
): NightshiftSource[] {
  const sources: NightshiftSource[] = [];
  const missing: string[] = [];
  for (const slug of slugs) {
    const source = findSource(catalog, slug);
    if (source) {
      sources.push(source);
    } else {
      missing.push(slug);
    }
  }
  if (missing.length > 0) {
    throw new UnknownSourceSlugError(missing);
  }
  return sources;
}

/**
 * Slug for a stored source id. An id that is not in the catalog (for example a
 * deleted source) is returned unchanged: stored values are source ids.
 */
export function presentSlug(catalog: SourceCatalog, storedId: string): string {
  return catalog.byId.get(storedId)?.slug ?? storedId;
}

/** Throws {@link SourceDisabledError} when the source is turned off. */
export function assertSourceEnabled(source: NightshiftSource): void {
  if (!source.enabled) {
    throw new SourceDisabledError(source.slug);
  }
}

/** Fields every successful tool result includes for a source it resolved. */
export function toSourceRef(source: NightshiftSource): {
  slug: string;
  title: string;
  view_name: string;
} {
  return { slug: source.slug, title: source.title, view_name: source.view_name };
}
