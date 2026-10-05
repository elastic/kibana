/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { listAllSources } from './list_all_sources';

/** Most source ids one request may filter by. Matches the page size of the source list. */
export const MAX_SOURCE_IDS_PER_REQUEST = MAX_SOURCES_PER_PAGE;

/**
 * Source ids a read is scoped to. An omitted filter is the whole catalog. A
 * caller-provided list is returned as-is, since those values are already
 * source ids and checking them would list every source on the read path.
 */
export async function requestedOrAllSourceIds(
  sourceIds: string[] | undefined,
  sourcesClient: SourcesClient
): Promise<string[]> {
  if (sourceIds?.length) {
    return sourceIds;
  }
  return (await listAllSources(sourcesClient)).map((source) => source.id);
}
