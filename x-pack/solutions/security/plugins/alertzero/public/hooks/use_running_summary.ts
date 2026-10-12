/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useWorkers } from './use_workers_api';

export interface RunningSummary {
  watchCount: number;
  enabledWorkerCount: number;
  workerCount: number;
}

/**
 * Counts what is switched on; the API exposes no in-progress flag, so "running" means enabled.
 * A Watch counts when any of its Workers is enabled: the Watches API only returns catalog
 * placeholders, so the settings an analyst changes live on the Workers.
 */
export const useRunningSummary = (): RunningSummary => {
  const { data: workersData } = useWorkers();
  const workers = workersData?.workers ?? [];
  const enabledWorkers = workers.filter(({ enabled }) => enabled);

  return {
    watchCount: new Set(enabledWorkers.flatMap(({ watchIds }) => watchIds)).size,
    enabledWorkerCount: enabledWorkers.length,
    workerCount: workers.length,
  };
};
