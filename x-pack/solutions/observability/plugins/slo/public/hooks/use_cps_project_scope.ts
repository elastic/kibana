/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICPSManager, ProjectsData } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

export interface CpsProjectScope {
  showProjectScopeUI: boolean;
  cpsManager: ICPSManager | undefined;
  /** Stable callback for the picker components, which hold it in effect dependencies. */
  fetchProjects: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}

/** Resolves whether project scope UI may render, and the project fetcher it needs. */
export function useCpsProjectScope(): CpsProjectScope {
  const { isServerless } = usePluginContext();
  const { cps } = useKibana().services;
  const cpsManager = cps?.cpsManager;

  const fetchProjects = useCallback(
    (projectRouting?: ProjectRouting) =>
      cpsManager ? cpsManager.fetchProjects(projectRouting) : Promise.resolve(null),
    [cpsManager]
  );

  return {
    showProjectScopeUI: Boolean(isServerless && cps?.isTierEligible && cpsManager),
    cpsManager,
    fetchProjects,
  };
}
