/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { ListWorkersResponse } from '@kbn/alertzero-common';
import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/alertzero-common';
import { useWorkers } from '../../hooks/use_workers_api';

type WorkerToggleState = Record<string, boolean>;

export type CatalogWorker = (typeof SYSTEM_SECURITY_WORKER_CATALOG)[number];
export type ServerWorker = ListWorkersResponse['workers'][number];

const initialToggleState = (): WorkerToggleState =>
  Object.fromEntries(SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => [id, true]));

/**
 * Owns the worker-selection state: which catalog workers the server exposes, which are toggled
 * on, and the guard that keeps at least one worker enabled.
 */
export const useWorkerSelection = () => {
  // Intersect the server-returned worker list with the catalog so skill-gated workers
  // absent from the response are not shown as toggles (or counted toward the minimum).
  const { data: workersData } = useWorkers();
  const serverWorkers = useMemo(
    () => new Map((workersData?.workers ?? []).map((w) => [w.id, w])),
    [workersData]
  );
  const workers = useMemo(
    () => SYSTEM_SECURITY_WORKER_CATALOG.filter(({ id }) => serverWorkers.has(id)),
    [serverWorkers]
  );
  const availableWorkerIds = useMemo(() => workers.map(({ id }) => id), [workers]);

  const [workerEnabled, setWorkerEnabled] = useState<WorkerToggleState>(initialToggleState);

  const enabledCount = availableWorkerIds.filter((id) => workerEnabled[id]).length;

  const toggleWorker = (workerId: string, checked: boolean) => {
    if (!checked && enabledCount <= 1) return;
    setWorkerEnabled((prev) => ({ ...prev, [workerId]: checked }));
  };

  return { workers, serverWorkers, availableWorkerIds, workerEnabled, enabledCount, toggleWorker };
};
