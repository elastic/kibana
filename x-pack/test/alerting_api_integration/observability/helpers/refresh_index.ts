/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';

/**
 * Copied from x-pack/test/security_solution_api_integration/test_suites/detections_response/utils/refresh_index.ts
 *
 * Refresh an index, making changes available to search.
 * Reusable utility which refreshes all saved object indices, to make them available for search, especially
 * useful when needing to perform a search on an index that has just been written to.
 *
 * An example of this when installing the prebuilt detection rules SO of type 'security-rule':
 * the savedObjectsClient does this with a call with explicit `refresh: false`.
 * So, despite of the fact that the endpoint waits until the prebuilt rule will be
 * successfully indexed, it doesn't wait until they become "visible" for subsequent read
 * operations.
 *
 * Additionally, this method clears the cache for all saved object indices. This helps in cases in which
 * saved object is read, then written to, and then read again, and the second read returns stale data.
 * @param es The Elasticsearch client
 */
export const refreshSavedObjectIndices = async (es: Client) => {
  // Refresh indices to prevent a race condition between a write and subsequent read operation. To
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  // Additionally, we need to clear the cache to ensure that the next read operation will
  // not return stale data.
  await es.indices.clearCache({ index: ALL_SAVED_OBJECT_INDICES });
};
