/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useWatches } from './use_watches_api';
import { useWorkers } from './use_workers_api';

export interface RunningSummary {
  watchCount: number;
  enabledWorkerCount: number;
  workerCount: number;
}

/** Counts what is switched on; the API exposes no in-progress flag, so "running" means enabled. */
export const useRunningSummary = (): RunningSummary => {
  const { data: watchesData } = useWatches();
  const { data: workersData } = useWorkers();
  const workers = workersData?.workers ?? [];

  return {
    watchCount: (watchesData?.watches ?? []).filter(({ enabled }) => enabled).length,
    enabledWorkerCount: workers.filter(({ enabled }) => enabled).length,
    workerCount: workers.length,
  };
};
