/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFormRow, EuiPopover, EuiSpacer, EuiText } from '@elastic/eui';
import { ProjectScopePicker, useFetchProjects } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  ALL_PROJECT_ROUTING,
  LOCAL_PROJECT_ROUTING,
  normalizeDefinedRouting,
} from '../../../../../common/project_routings';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import {
  getProjectScopeLabel,
  PROJECT_SCOPE_LABEL,
  PROJECT_SCOPE_LOADING_LABEL,
  PROJECT_SCOPE_UNAVAILABLE_LABEL,
  toStoredProjectRouting,
} from '../../../../utils/slo/project_scope';
import type { CreateSLOForm } from '../../types';

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

  // Passed to the picker as-is: it resolves `_alias:_origin` against `originProjectId` itself.
  const pickerProjectRouting = useMemo(
    () => normalizeDefinedRouting(projectRoutings ?? null),
    [projectRoutings]
  );

  const buttonLabel = useMemo(
    () =>
      isLoading
        ? PROJECT_SCOPE_LOADING_LABEL
        : getProjectScopeLabel({
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
        error={error ? PROJECT_SCOPE_UNAVAILABLE_LABEL : undefined}
        isInvalid={Boolean(error)}
        label={PROJECT_SCOPE_LABEL}
      >
        <EuiPopover
          aria-label={PROJECT_SCOPE_LABEL}
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
              <p>{PROJECT_SCOPE_UNAVAILABLE_LABEL}</p>
            </EuiText>
          ) : (
            <ProjectScopePicker
              availableProjects={availableProjects}
              fetchProjectsByRouting={fetchProjects}
              onProjectRoutingChange={handleProjectRoutingChange}
              originProjectId={originProjectId}
              projectRouting={pickerProjectRouting}
              projectRoutingStrategy="snapshot"
            />
          )}
        </EuiPopover>
      </EuiFormRow>
      <EuiSpacer size="xl" />
    </>
  );
}
