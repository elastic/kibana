/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { StatusError } from '../../lib/errors/status_error';

/** Saved-object find cap. The catalog is read in one page. */
const MAX_LISTED_SOURCES = 10_000;

/**
 * Loads the space's source catalog in one request. A short page fails the
 * call: callers treat the result as the full catalog, and the sweep retires
 * any id that is missing from it.
 */
export async function listAllSources(
  sourcesClient: SourcesClient,
  options?: { enabled?: boolean }
): Promise<NightshiftSource[]> {
  const { sources, total } = await sourcesClient.list({
    page: 1,
    perPage: MAX_LISTED_SOURCES,
    enabled: options?.enabled,
  });
  if (total > sources.length) {
    throw new StatusError(
      `Source catalog has ${total} sources, above the ${MAX_LISTED_SOURCES} saved-object find cap`,
      500
    );
  }
  return sources;
}
