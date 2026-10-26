/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import { useEffect } from 'react';
import { EMPTY, skip } from 'rxjs';
import { useReloadRequestTimeContext } from '../hooks/use_reload_request_time';

/**
 * When the user changes CPS project routing, refresh data that depends on `useReloadRequestTimeContext`
 * (same idea as APM's `CpsProjectRoutingSync` + `TimeRangeIdContext`).
 */
export function CpsProjectRoutingSync() {
  const { updateReloadRequestTime } = useReloadRequestTimeContext();
  const { services } = useKibana<{ cps?: CPSPluginStart }>();
  const cpsManager = services.cps?.cpsManager;

  useEffect(() => {
    const subscription = (cpsManager?.getProjectRouting$() ?? EMPTY).pipe(skip(1)).subscribe(() => {
      updateReloadRequestTime();
    });
    return () => subscription.unsubscribe();
  }, [cpsManager, updateReloadRequestTime]);

  return null;
}
