/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';

/** Saved-object find cap. The catalog is read in one page. */
const MAX_LISTED_SOURCES = 10_000;

/** Loads the space's source catalog in one request. */
export async function listAllSources(
  sourcesClient: SourcesClient,
  options?: { enabled?: boolean }
): Promise<NightshiftSource[]> {
  const { sources } = await sourcesClient.list({
    page: 1,
    perPage: MAX_LISTED_SOURCES,
    enabled: options?.enabled,
  });
  return sources;
}
