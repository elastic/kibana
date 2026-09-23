/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { listAllSources } from './list_all_sources';

/**
 * `findQueries` / `findIndicators` early-return on an empty id list, while
 * `getQueryLinks` treats empty as "all sources". An empty filter is every
 * catalog id so search and list stay aligned.
 */
export async function resolveStreamNames(
  streamNames: string[] | undefined,
  sourcesClient: SourcesClient
): Promise<string[]> {
  if (streamNames?.length) {
    return streamNames;
  }
  return (await listAllSources(sourcesClient)).map((source) => source.id);
}
