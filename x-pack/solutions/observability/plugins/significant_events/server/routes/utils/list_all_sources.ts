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

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';

/** Matches the sources API page cap. */
const LIST_SOURCES_PAGE_SIZE = 100;

/** Pages the space's source catalog until every row is loaded. */
export async function listAllSources(
  sourcesClient: SourcesClient,
  options?: { enabled?: boolean }
): Promise<NightshiftSource[]> {
  const sources: NightshiftSource[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (sources.length < total) {
    const response = await sourcesClient.list({
      page,
      perPage: LIST_SOURCES_PAGE_SIZE,
      enabled: options?.enabled,
    });
    total = response.total;
    sources.push(...response.sources);
    if (response.sources.length === 0) {
      break;
    }
    page += 1;
  }

  return sources;
}
