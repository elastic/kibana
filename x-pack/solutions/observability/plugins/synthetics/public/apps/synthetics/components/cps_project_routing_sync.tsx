/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { EMPTY, skip } from 'rxjs';
import { kibanaService } from '../../../utils/kibana_service';
import { useSyntheticsRefreshContext } from '../contexts';

/**
 * When the user changes CPS project routing, refresh overview / details queries
 * that key off `lastRefresh` (same idea as APM / Infra `CpsProjectRoutingSync`).
 */
export function CpsProjectRoutingSync() {
  const { refreshApp } = useSyntheticsRefreshContext();
  const cpsManager = kibanaService.startPlugins?.cps?.cpsManager;

  useEffect(() => {
    const subscription = (cpsManager?.getProjectRouting$() ?? EMPTY).pipe(skip(1)).subscribe(() => {
      refreshApp();
    });
    return () => subscription.unsubscribe();
  }, [cpsManager, refreshApp]);

  return null;
}
