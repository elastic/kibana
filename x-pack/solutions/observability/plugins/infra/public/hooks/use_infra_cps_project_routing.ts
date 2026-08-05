/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { ProjectRouting } from '@kbn/es-query';
import {
  OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
} from '../../common/cps_feature_flag';
import { useKibanaContextForPlugin } from './use_kibana';

export const useInfraCpsProjectRouting = ():
  | BehaviorSubject<ProjectRouting | undefined>
  | undefined => {
  const {
    services: { cps, featureFlags },
  } = useKibanaContextForPlugin();
  const infraCpsEnabled = featureFlags.getBooleanValue(
    OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
    OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT
  );
  const cpsManager = infraCpsEnabled ? cps?.cpsManager : undefined;

  const projectRouting$ = useMemo(() => {
    if (!cpsManager) return undefined;
    return new BehaviorSubject<ProjectRouting | undefined>(cpsManager.getProjectRouting());
  }, [cpsManager]);

  useEffect(() => {
    if (!cpsManager || !projectRouting$) return;

    const subscription = cpsManager.getProjectRouting$().subscribe((projectRouting) => {
      if (projectRouting !== projectRouting$.getValue()) {
        projectRouting$.next(projectRouting);
      }
    });

    return () => subscription.unsubscribe();
  }, [cpsManager, projectRouting$]);

  return projectRouting$;
};
