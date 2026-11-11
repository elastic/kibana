/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CPSProject } from '@kbn/cps-utils';
import { projectRoutingCodec } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../common/project_routings';

export const PROJECT_SCOPE_LABEL = i18n.translate('xpack.slo.projectScope.label', {
  defaultMessage: 'Project scope',
});

const ALL_PROJECTS_LABEL = i18n.translate('xpack.slo.projectScope.allProjectsLabel', {
  defaultMessage: 'All projects',
});

const THIS_PROJECT_LABEL = i18n.translate('xpack.slo.projectScope.thisProjectLabel', {
  defaultMessage: 'This project',
});

export const PROJECT_SCOPE_LOADING_LABEL = i18n.translate('xpack.slo.projectScope.loadingLabel', {
  defaultMessage: 'Loading',
});

export const PROJECT_SCOPE_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.slo.projectScope.unavailableLabel',
  {
    defaultMessage: 'Project scope unavailable',
  }
);

export const getProjectCountLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.slo.projectScope.projectCountLabel', {
    defaultMessage: '{selectedCount}/{totalCount} projects',
    values: { selectedCount, totalCount },
  });

export const isOriginProjectRouting = (
  projectRouting: string,
  originProjectId: string | undefined
): boolean => {
  if (projectRouting === LOCAL_PROJECT_ROUTING) {
    return true;
  }
  if (!originProjectId) {
    return false;
  }
  return projectRouting === `_id:${originProjectId}`;
};

/**
 * Collapses a routing emitted by the picker back to the canonical stored form, so an
 * origin-only selection persists as `_alias:_origin` rather than an equivalent `_id:` clause.
 */
export const toStoredProjectRouting = (
  emitted: string,
  originProjectId: string | undefined
): string => {
  if (emitted === ALL_PROJECT_ROUTING) {
    return ALL_PROJECT_ROUTING;
  }

  if (isOriginProjectRouting(emitted, originProjectId)) {
    return LOCAL_PROJECT_ROUTING;
  }

  return emitted;
};

/** The label for routings that need no project lookup to describe. */
export const getStaticProjectScopeLabel = (
  projectRouting: string,
  originProjectId?: string
): string | undefined => {
  if (projectRouting === ALL_PROJECT_ROUTING) {
    return ALL_PROJECTS_LABEL;
  }

  if (isOriginProjectRouting(projectRouting, originProjectId)) {
    return THIS_PROJECT_LABEL;
  }

  return undefined;
};

export const getSelectedProjectCount = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: string;
}): number => {
  if (projectRouting === ALL_PROJECT_ROUTING) {
    return availableProjects.length;
  }

  if (isOriginProjectRouting(projectRouting, originProjectId)) {
    return originProjectId ? 1 : 0;
  }

  const { excludedProjectIds, selectedProjectIds } = projectRoutingCodec.decode(projectRouting);

  if (selectedProjectIds.length > 0) {
    const availableProjectIds = new Set(availableProjects.map((project) => project._id));
    return selectedProjectIds.filter((projectId) => availableProjectIds.has(projectId)).length;
  }

  if (excludedProjectIds.length > 0) {
    const excluded = new Set(excludedProjectIds);
    return availableProjects.filter((project) => !excluded.has(project._id)).length;
  }

  return availableProjects.length;
};

export const getProjectScopeLabel = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: string;
}): string =>
  getStaticProjectScopeLabel(projectRouting, originProjectId) ??
  getProjectCountLabel(
    getSelectedProjectCount({ availableProjects, originProjectId, projectRouting }),
    availableProjects.length
  );
