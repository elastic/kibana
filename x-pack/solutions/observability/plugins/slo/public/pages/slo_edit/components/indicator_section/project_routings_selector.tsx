/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFormRow, EuiPopover, EuiSpacer, EuiText } from '@elastic/eui';
import type { CPSProject } from '@kbn/cps-utils';
import { ProjectScopePicker, projectRoutingCodec, useFetchProjects } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  ALL_PROJECT_ROUTING,
  LOCAL_PROJECT_ROUTING,
  normalizeDefinedRouting,
} from '../../../../../common/project_routings';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import type { CreateSLOForm } from '../../types';

const projectScopeLabel = i18n.translate('xpack.slo.sloEdit.projectRoutings.projectScopeLabel', {
  defaultMessage: 'Project scope',
});

const allProjectsButtonLabel = i18n.translate(
  'xpack.slo.sloEdit.projectRoutings.allProjectsButtonLabel',
  {
    defaultMessage: 'All projects',
  }
);

const thisProjectButtonLabel = i18n.translate(
  'xpack.slo.sloEdit.projectRoutings.thisProjectButtonLabel',
  {
    defaultMessage: 'This project',
  }
);

const loadingButtonLabel = i18n.translate('xpack.slo.sloEdit.projectRoutings.loadingButtonLabel', {
  defaultMessage: 'Loading',
});

const unavailableErrorMessage = i18n.translate(
  'xpack.slo.sloEdit.projectRoutings.unavailableErrorMessage',
  {
    defaultMessage: 'Project scope unavailable',
  }
);

const getCustomProjectsButtonLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.slo.sloEdit.projectRoutings.customProjectsButtonLabel', {
    defaultMessage: '{selectedCount}/{totalCount} projects',
    values: { selectedCount, totalCount },
  });

const originOnlyExpression = (originProjectId: string): string => `_id:${originProjectId}`;

const isThisProjectRouting = (
  projectRouting: string,
  originProjectId: string | undefined
): boolean => {
  if (projectRouting === LOCAL_PROJECT_ROUTING) {
    return true;
  }
  if (!originProjectId) {
    return false;
  }
  return projectRouting === originOnlyExpression(originProjectId);
};

const toPickerInput = (
  stored: string | null | undefined,
  originProjectId: string | undefined
): string => {
  const normalized = stored == null ? LOCAL_PROJECT_ROUTING : normalizeDefinedRouting(stored);
  if (normalized !== LOCAL_PROJECT_ROUTING || !originProjectId) return normalized;
  return originOnlyExpression(originProjectId);
};

const toStoredProjectRouting = (emitted: string, originProjectId: string | undefined): string => {
  if (emitted === ALL_PROJECT_ROUTING) {
    return ALL_PROJECT_ROUTING;
  }

  if (emitted === LOCAL_PROJECT_ROUTING) {
    return LOCAL_PROJECT_ROUTING;
  }

  if (originProjectId && emitted === originOnlyExpression(originProjectId)) {
    return LOCAL_PROJECT_ROUTING;
  }

  return emitted;
};

const getSelectedProjectCount = ({
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

  if (isThisProjectRouting(projectRouting, originProjectId)) {
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

const getProjectScopeButtonLabel = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: string;
}): string => {
  if (projectRouting === ALL_PROJECT_ROUTING) {
    return allProjectsButtonLabel;
  }

  if (isThisProjectRouting(projectRouting, originProjectId)) {
    return thisProjectButtonLabel;
  }

  const selectedProjectCount = getSelectedProjectCount({
    availableProjects,
    originProjectId,
    projectRouting,
  });

  return getCustomProjectsButtonLabel(selectedProjectCount, availableProjects.length);
};

export function ProjectRoutingsSelector() {
  const { watch, setValue } = useFormContext<CreateSLOForm>();
  const { isServerless } = usePluginContext();
  const { cps } = useKibana().services;
  const cpsManager = cps?.cpsManager;
  const projectRoutings = watch('settings.projectRoutings');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      if (!cpsManager) {
        return Promise.resolve(null);
      }
      return cpsManager.fetchProjects(routing);
    },
    [cpsManager]
  );

  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    ALL_PROJECT_ROUTING
  );
  const availableProjects = useMemo(
    () => (originProject ? [originProject, ...linkedProjects] : linkedProjects),
    [linkedProjects, originProject]
  );
  const isGateOpen = Boolean(isServerless && cps?.isTierEligible && cpsManager);
  const originProjectId = originProject?._id;

  const pickerProjectRouting = useMemo(
    () => toPickerInput(projectRoutings, originProjectId),
    [originProjectId, projectRoutings]
  );

  const buttonLabel = useMemo(
    () =>
      isLoading
        ? loadingButtonLabel
        : getProjectScopeButtonLabel({
            availableProjects,
            originProjectId,
            projectRouting: pickerProjectRouting,
          }),
    [availableProjects, isLoading, originProjectId, pickerProjectRouting]
  );

  useEffect(() => {
    if (!isGateOpen || linkedProjects.length === 0 || projectRoutings !== undefined) {
      return;
    }
    setValue('settings.projectRoutings', LOCAL_PROJECT_ROUTING);
  }, [isGateOpen, linkedProjects.length, projectRoutings, setValue]);

  const handleProjectRoutingChange = useCallback(
    (nextProjectRouting: ProjectRouting) => {
      if (nextProjectRouting === undefined) {
        return;
      }
      setValue(
        'settings.projectRoutings',
        toStoredProjectRouting(nextProjectRouting, originProjectId)
      );
    },
    [originProjectId, setValue]
  );

  if (!isGateOpen) {
    return null;
  }

  if (!isLoading && !error && linkedProjects.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFormRow
        error={error ? unavailableErrorMessage : undefined}
        isInvalid={Boolean(error)}
        label={projectScopeLabel}
      >
        <EuiPopover
          aria-label={projectScopeLabel}
          button={
            <EuiButton
              color="text"
              data-test-subj="sloProjectRoutingsSelector"
              fullWidth
              iconType="crossProjectSearch"
              isDisabled={isLoading || Boolean(error)}
              isLoading={isLoading}
              onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
              size="m"
            >
              {buttonLabel}
            </EuiButton>
          }
          closePopover={() => setIsPopoverOpen(false)}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          {error ? (
            <EuiText color="danger" size="s">
              <p>{unavailableErrorMessage}</p>
            </EuiText>
          ) : (
            <ProjectScopePicker
              availableProjects={availableProjects}
              fetchProjectsByRouting={fetchProjects}
              onProjectRoutingChange={handleProjectRoutingChange}
              originProjectId={originProjectId}
              projectRouting={pickerProjectRouting}
            />
          )}
        </EuiPopover>
      </EuiFormRow>
      <EuiSpacer size="xl" />
    </>
  );
}
