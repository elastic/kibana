/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ProjectRouting } from '@kbn/es-query';
import {
  type ICPSManager,
  PROJECT_ROUTING,
  useFetchProjects,
  useIsCpsMultiProject,
} from '@kbn/cps-utils';

const allProjectsLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeAllProjectsLabel', {
  defaultMessage: 'All',
});

const getCustomProjectScopeLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.infra.analysisSetup.projectScopeCustomProjectsLabel', {
    defaultMessage: '{selectedCount}/{totalCount} projects',
    values: { selectedCount, totalCount },
  });

export interface ProjectScopeLabelState {
  label: string;
  isLoading: boolean;
  hasError: boolean;
  /**
   * `true` once cross-project search is ready with at least one linked project, `false` once ready
   * with none, and `undefined` while readiness is pending. Project scope is meaningless without
   * linked projects, so callers hide their control on `false`.
   */
  isCpsMultiProject: boolean | undefined;
}

/**
 * Describes a CPS project routing expression the way the project picker does: "All" when every
 * project is in scope, otherwise how many of the deployment's projects it selects. Shared by the
 * ML setup form and the read-only job scope display so the two cannot describe the same scope
 * differently.
 */
export const useProjectScopeLabel = ({
  cpsManager,
  projectRouting,
}: {
  cpsManager: ICPSManager;
  projectRouting: ProjectRouting;
}): ProjectScopeLabelState => {
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );

  const isCpsMultiProject = useIsCpsMultiProject(cpsManager);

  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    projectRouting ?? PROJECT_ROUTING.ALL
  );

  const selectedProjectCount = (originProject ? 1 : 0) + linkedProjects.length;
  const totalProjectCount = cpsManager.getTotalProjectCount();

  const label = useMemo(() => {
    if (!projectRouting || projectRouting === PROJECT_ROUTING.ALL) {
      return allProjectsLabel;
    }

    return getCustomProjectScopeLabel(selectedProjectCount, totalProjectCount);
  }, [projectRouting, selectedProjectCount, totalProjectCount]);

  return {
    label,
    isLoading: isLoading || isCpsMultiProject === undefined,
    hasError: Boolean(error),
    isCpsMultiProject,
  };
};
