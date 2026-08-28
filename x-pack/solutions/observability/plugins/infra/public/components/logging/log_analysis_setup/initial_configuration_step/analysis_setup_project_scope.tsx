/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFormRow, EuiFlexItem, EuiTitle, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import {
  type CPSProject,
  type ICPSManager,
  PROJECT_ROUTING,
  useFetchProjects,
} from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

const projectScopeLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeLabel', {
  defaultMessage: 'Project scope',
});

const allProjectsLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeAllProjectsLabel', {
  defaultMessage: 'All projects',
});

const thisProjectLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeThisProjectLabel', {
  defaultMessage: 'This project',
});

const defaultScopeLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeDefaultLabel', {
  defaultMessage: 'Default',
});

const loadingLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeLoadingLabel', {
  defaultMessage: 'Loading',
});

const unavailableLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeUnavailableLabel', {
  defaultMessage: 'Project scope unavailable',
});

const getCustomProjectScopeLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.infra.analysisSetup.projectScopeCustomProjectsLabel', {
    defaultMessage: '{selectedCount}/{totalCount} projects',
    values: { selectedCount, totalCount },
  });

const getProjectCount = (originProject: CPSProject | null, linkedProjects: CPSProject[]): number =>
  (originProject ? 1 : 0) + linkedProjects.length;

const getProjectScopeButtonLabel = ({
  projectRouting,
  selectedProjectCount,
  totalProjectCount,
}: {
  projectRouting: ProjectRouting;
  selectedProjectCount: number;
  totalProjectCount: number;
}): string => {
  if (projectRouting === undefined) {
    return defaultScopeLabel;
  }

  if (projectRouting === PROJECT_ROUTING.ALL) {
    return allProjectsLabel;
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return thisProjectLabel;
  }

  return getCustomProjectScopeLabel(selectedProjectCount, totalProjectCount);
};

export interface LoadedProjectScopeProjects {
  originProject: CPSProject | null;
  linkedProjects: CPSProject[];
}

export interface AnalysisSetupProjectScopeProps {
  projectRouting: ProjectRouting;
  onOpenProjectScope: (projects: LoadedProjectScopeProjects) => void;
}

interface AnalysisSetupProjectScopeButtonProps extends AnalysisSetupProjectScopeProps {
  cpsManager: ICPSManager;
}

const AnalysisSetupProjectScopeButton: FC<AnalysisSetupProjectScopeButtonProps> = ({
  cpsManager,
  onOpenProjectScope,
  projectRouting,
}) => {
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    PROJECT_ROUTING.ALL
  );
  const {
    originProject: routedOriginProject,
    linkedProjects: routedLinkedProjects,
    isLoading: isRoutingLoading,
    error: routingError,
  } = useFetchProjects(fetchProjects, projectRouting || PROJECT_ROUTING.ORIGIN);
  const totalProjectCount = getProjectCount(originProject, linkedProjects);
  const selectedProjectCount = getProjectCount(routedOriginProject, routedLinkedProjects);
  const hasError = Boolean(error || routingError);
  const isProjectScopeLoading = isLoading || isRoutingLoading;
  const hasLinkedProjects = linkedProjects.length > 0;
  const buttonLabel = useMemo(
    () =>
      getProjectScopeButtonLabel({
        projectRouting,
        selectedProjectCount,
        totalProjectCount,
      }),
    [projectRouting, selectedProjectCount, totalProjectCount]
  );
  const openProjectScope = useCallback(() => {
    onOpenProjectScope({ originProject, linkedProjects });
  }, [linkedProjects, onOpenProjectScope, originProject]);

  if (!isProjectScopeLoading && !hasError && !hasLinkedProjects) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.infra.analysisSetup.projectScopeSelectionTitle"
              defaultMessage="Choose project scope"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.infra.analysisSetup.projectScopeSelectionDescription"
            defaultMessage="By default, Machine Learning analyzes log messages in linked projects according to the default project scope for the space. You can configure a different project scope to control which projects are analyzed. Regardless of project scope, analysis results live exclusively in the current project. Keep in mind that, once the job is created, updating the project scope will require re-creating it."
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          error={hasError ? unavailableLabel : undefined}
          isInvalid={hasError}
          label={projectScopeLabel}
        >
          <EuiButton
            color="text"
            data-test-subj="infraLogAnalysisSetupProjectScopeButton"
            iconType="crossProjectSearch"
            isDisabled={isProjectScopeLoading || hasError}
            isLoading={isProjectScopeLoading}
            onClick={openProjectScope}
            size="m"
          >
            {hasError ? unavailableLabel : isProjectScopeLoading ? loadingLabel : buttonLabel}
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AnalysisSetupProjectScopeForm: FC<AnalysisSetupProjectScopeProps> = ({
  onOpenProjectScope,
  projectRouting,
}) => {
  const {
    services: { cps },
  } = useKibanaContextForPlugin();
  const cpsManager = cps?.cpsManager;

  if (!cps?.isTierEligible || !cpsManager) {
    return null;
  }

  return (
    <AnalysisSetupProjectScopeButton
      cpsManager={cpsManager}
      onOpenProjectScope={onOpenProjectScope}
      projectRouting={projectRouting}
    />
  );
};
