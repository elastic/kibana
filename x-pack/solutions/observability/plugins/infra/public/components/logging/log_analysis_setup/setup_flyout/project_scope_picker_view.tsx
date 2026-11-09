/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING, ProjectScopePickerFlyoutContent } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { useLogEntryCategoriesSetupContext } from '../../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogEntryRateSetupContext } from '../../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import type { LoadedProjectScopeProjects } from '../initial_configuration_step';
import type { ModuleId } from './setup_flyout_state';

const changeProjectScopeTitle = i18n.translate(
  'xpack.infra.logs.analysis.projectScopePickerTitle',
  {
    defaultMessage: 'Change project scope',
  }
);

const backToSetupLabel = i18n.translate(
  'xpack.infra.logs.analysis.projectScopePickerBackAriaLabel',
  {
    defaultMessage: 'Back to job setup',
  }
);

interface ProjectScopePickerViewProps {
  moduleId: ModuleId;
  onClose: () => void;
  projects: LoadedProjectScopeProjects;
  titleId: string;
}

/**
 * Renders the CPS project scope picker as the content of the setup flyout, reading and
 * writing the draft routing from the active module's setup state, which is provided
 * above the flyout content swap so it survives view changes.
 */
export const ProjectScopePickerView: FC<ProjectScopePickerViewProps> = ({
  moduleId,
  ...contentProps
}) => {
  switch (moduleId) {
    case 'logs_ui_analysis':
      return <LogEntryRateProjectScopePickerView {...contentProps} />;
    case 'logs_ui_categories':
      return <LogEntryCategoriesProjectScopePickerView {...contentProps} />;
  }
};

type ModuleProjectScopePickerViewProps = Omit<ProjectScopePickerViewProps, 'moduleId'>;

const LogEntryCategoriesProjectScopePickerView: FC<ModuleProjectScopePickerViewProps> = (props) => {
  const { projectRouting, setProjectRouting } = useLogEntryCategoriesSetupContext();

  return (
    <ProjectScopePickerViewContent
      {...props}
      projectRouting={projectRouting}
      onApplyProjectRouting={setProjectRouting}
    />
  );
};

const LogEntryRateProjectScopePickerView: FC<ModuleProjectScopePickerViewProps> = (props) => {
  const { projectRouting, setProjectRouting } = useLogEntryRateSetupContext();

  return (
    <ProjectScopePickerViewContent
      {...props}
      projectRouting={projectRouting}
      onApplyProjectRouting={setProjectRouting}
    />
  );
};

const ProjectScopePickerViewContent: FC<
  ModuleProjectScopePickerViewProps & {
    projectRouting: ProjectRouting;
    onApplyProjectRouting: (projectRouting: ProjectRouting) => void;
  }
> = ({ onApplyProjectRouting, onClose, projectRouting, projects, titleId }) => {
  const {
    services: { cps },
  } = useKibanaContextForPlugin();

  const defaultProjectRoutingGetter = useCallback(() => {
    return cps?.cpsManager?.getDefaultProjectRouting() ?? PROJECT_ROUTING.ALL;
  }, [cps?.cpsManager]);

  const fetchProjectsByRouting = useCallback(
    (routing?: ProjectRouting) => cps?.cpsManager?.fetchProjects(routing) ?? Promise.resolve(null),
    [cps?.cpsManager]
  );

  const availableProjects = useMemo(
    () =>
      projects.originProject
        ? [projects.originProject, ...projects.linkedProjects]
        : projects.linkedProjects,
    [projects.linkedProjects, projects.originProject]
  );

  const applyProjectScope = useCallback(
    (newProjectRouting: NonNullable<ProjectRouting>) => {
      onApplyProjectRouting(newProjectRouting);
      onClose();
    },
    [onApplyProjectRouting, onClose]
  );

  return (
    <ProjectScopePickerFlyoutContent
      availableProjects={availableProjects}
      backButtonLabel={backToSetupLabel}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      fetchProjectsByRouting={fetchProjectsByRouting}
      onApplyChanges={applyProjectScope}
      onClose={onClose}
      originProjectId={projects.originProject?._id}
      projectRouting={projectRouting ?? defaultProjectRoutingGetter()}
      projectRoutingStrategy="snapshot"
      title={changeProjectScopeTitle}
      titleId={titleId}
    />
  );
};
