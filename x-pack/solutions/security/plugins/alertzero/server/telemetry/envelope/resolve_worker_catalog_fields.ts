/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/alertzero-common';
import type { AlertZeroWatchTag, AlertZeroWorkerId } from '../constants';
import { OTHER_WATCH_TAG, OTHER_WORKER_ID } from '../constants';

export interface AlertZeroWorkerCatalogFields {
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

const OTHER_WORKER: AlertZeroWorkerCatalogFields = {
  watch_tag: OTHER_WATCH_TAG,
  worker_id: OTHER_WORKER_ID,
};

/** Maps a managed workflow id to its catalog `worker_id` and `watch_tag`, else to `other`. */
export const resolveWorkerCatalogFields = (
  workerId: string | null | undefined
): AlertZeroWorkerCatalogFields => {
  const entry = SYSTEM_SECURITY_WORKER_CATALOG.find(({ id }) => id === workerId);
  return entry ? { watch_tag: entry.watchTag, worker_id: entry.id } : OTHER_WORKER;
};
