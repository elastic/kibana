/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useCallback, useEffect, useMemo } from 'react';
import type {
  MigrationsServiceTaskStats,
  SiemMigrationsServiceBase,
} from '../migrations_service_base';

export const useLatestStats = <T extends MigrationsServiceTaskStats>(
  migrationService: SiemMigrationsServiceBase<T>
) => {
  useEffect(() => {
    migrationService.startPolling();
  }, [migrationService]);

  const refreshStats = useCallback(() => {
    migrationService.getMigrationsStats(); // this updates latestStats$ internally
  }, [migrationService]);

  const latestStats$ = useMemo(() => migrationService.getLatestStats$(), [migrationService]);
  const latestStats = useObservable(latestStats$, null);

  return { data: latestStats ?? [], isLoading: latestStats === null, refreshStats };
};
