/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import type { Client } from '@elastic/elasticsearch';

export const refreshSavedObjectIndices = async (es: Client) => {
  // In cases such as when installing the prebuilt detection rules SO of type 'security-rule',
  // The savedObjectsClient does this with a call with explicit `refresh: false`.
  // So, despite of the fact that the endpoint waits until the prebuilt rule will be
  // successfully indexed, it doesn't wait until they become "visible" for subsequent read
  // operations.
  // And this is usually what we do next in integration tests: we read these SOs with utility
  // function such as getPrebuiltRulesAndTimelinesStatus().
  // This can cause race condition between a write and subsequent read operation, and to
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  // Additionally, we need to clear the cache to ensure that the next read operation will
  // not return stale data.
  await es.indices.clearCache({ index: ALL_SAVED_OBJECT_INDICES });
};
