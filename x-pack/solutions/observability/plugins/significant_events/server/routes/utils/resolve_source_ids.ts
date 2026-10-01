/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { listAllSources } from './list_all_sources';

/**
 * Source ids for a KI read. An omitted filter is the whole catalog. A
 * caller-provided list is returned as-is, since those values are already
 * source ids and checking them would list every source on the read path.
 * The HTTP query parameter is still named `streamNames`.
 */
export async function resolveSourceIds(
  sourceIds: string[] | undefined,
  sourcesClient: SourcesClient
): Promise<string[]> {
  if (sourceIds?.length) {
    return sourceIds;
  }
  return (await listAllSources(sourcesClient)).map((source) => source.id);
}
