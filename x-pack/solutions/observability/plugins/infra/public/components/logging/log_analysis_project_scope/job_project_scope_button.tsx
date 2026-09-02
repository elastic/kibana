/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useState } from 'react';
import { EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProjectRouting } from '@kbn/es-query';
import { type ICPSManager, ProjectPickerContent } from '@kbn/cps-utils';
import { ProjectScopeButton } from './project_scope_button';
import { useProjectScopeLabel } from './use_project_scope_label';

const projectScopeLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeLabel', {
  defaultMessage: 'Project scope',
});

const getJobProjectScopeLabel = (jobName: string, projectScope: string): string =>
  i18n.translate('xpack.infra.logs.analysis.projectScopeJobLabel', {
    defaultMessage: '{jobName}: {projectScope}',
    values: { jobName, projectScope },
  });

export interface JobProjectScopeButtonProps {
  cpsManager: ICPSManager;
  projectRouting: ProjectRouting;
  /** Identifies the job when a page describes more than one; omitted when there is only one. */
  name?: string;
}

/**
 * Shows the projects a single ML job analyzes, opening a read-only list of them.
 */
export const JobProjectScopeButton: FC<JobProjectScopeButtonProps> = ({
  cpsManager,
  projectRouting,
  name,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { label, isLoading, hasError } = useProjectScopeLabel({ cpsManager, projectRouting });

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );

  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  return (
    <EuiPopover
      anchorPosition="downLeft"
      aria-label={projectScopeLabel}
      button={
        <ProjectScopeButton
          data-test-subj="infraLogAnalysisJobProjectScopeButton"
          hasError={hasError}
          variant={'empty'}
          isLoading={isLoading}
          label={label}
          decorateLabel={name ? (text) => getJobProjectScopeLabel(name, text) : undefined}
          onClick={togglePopover}
        />
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <ProjectPickerContent
        controlsState="hidden"
        customHeaderText={projectScopeLabel}
        fetchProjectsByRouting={fetchProjects}
        projectRouting={projectRouting}
      />
    </EuiPopover>
  );
};
