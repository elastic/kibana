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
 * Resolves slugs to sources in the caller's order. Duplicate slugs repeat the
 * same source. Throws {@link UnknownSourceSlugError} if any slug is missing.
 */
export function resolveSourcesBySlug(
  catalog: SourceCatalog,
  slugs: readonly string[]
): NightshiftSource[] {
  const missing = slugs.filter((slug) => !catalog.bySlug.has(slug));
  if (missing.length > 0) {
    throw new UnknownSourceSlugError(missing);
  }
  return slugs.map((slug) => {
    const source = catalog.bySlug.get(slug);
    if (!source) {
      throw new UnknownSourceSlugError([slug]);
    }
    return source;
  });
}

/**
 * Slug for a stored source id. An id that is not in the catalog is returned
 * unchanged: workflow writes still store stream names until that cutover.
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
