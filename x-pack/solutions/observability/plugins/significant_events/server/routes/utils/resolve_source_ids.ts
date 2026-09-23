/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { listAllSources } from './list_all_sources';

/**
 * Source ids for a KI read. An omitted filter is the whole catalog. An
 * explicit list keeps only ids that are still sources, in the caller's order.
 * The HTTP query parameter is still named `streamNames`.
 */
export async function resolveSourceIds(
  sourceIds: string[] | undefined,
  sourcesClient: SourcesClient
): Promise<string[]> {
  const catalogIds = new Set((await listAllSources(sourcesClient)).map((source) => source.id));
  if (!sourceIds?.length) {
    return [...catalogIds];
  }
  return sourceIds.filter((sourceId) => catalogIds.has(sourceId));
}
