/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback } from 'react';
import { EuiFlexGroup, EuiFormRow, EuiFlexItem, EuiTitle, EuiText } from '@elastic/eui';
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
import { ProjectScopeButton, useProjectScopeLabel } from '../../log_analysis_project_scope';
import type { ProjectRoutingValidationError } from './validation';

const projectScopeLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeLabel', {
  defaultMessage: 'Project scope',
});

const unavailableLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeUnavailableLabel', {
  defaultMessage: 'Project scope unavailable',
});

const missingProjectScopeLabel = i18n.translate(
  'xpack.infra.analysisSetup.projectScopeMissingLabel',
  {
    defaultMessage: 'Select an explicit project scope for the job.',
  }
);

export interface LoadedProjectScopeProjects {
  originProject: CPSProject | null;
  linkedProjects: CPSProject[];
}

export interface AnalysisSetupProjectScopeFormProps {
  isCpsEnabled: boolean;
  isCpsManagerReady: boolean;
  projectRouting: ProjectRouting;
  onOpenProjectScope: (projects: LoadedProjectScopeProjects) => void;
  validationErrors?: ProjectRoutingValidationError[];
  disabled?: boolean;
}

interface AnalysisSetupProjectScopeFormInnerProps
  extends Omit<AnalysisSetupProjectScopeFormProps, 'isCpsEnabled'> {
  cpsManager: ICPSManager;
}

const AnalysisSetupProjectScopeFormInner: FC<AnalysisSetupProjectScopeFormInnerProps> = ({
  cpsManager,
  isCpsManagerReady,
  onOpenProjectScope,
  projectRouting,
  validationErrors = [],
  disabled = false,
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
    label: buttonLabel,
    isLoading: isLabelLoading,
    hasError: hasLabelError,
    isCpsMultiProject,
  } = useProjectScopeLabel({ cpsManager, projectRouting });

  const hasError = Boolean(error) || hasLabelError;
  const isProjectScopeLoading = isLoading || isLabelLoading;

  const openProjectScope = useCallback(() => {
    onOpenProjectScope({ originProject, linkedProjects });
  }, [linkedProjects, onOpenProjectScope, originProject]);

  if (isCpsMultiProject === false && !hasError && validationErrors.length === 0) {
    return null;
  }

  const isButtonLoading = isProjectScopeLoading || !isCpsManagerReady;

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
            defaultMessage="By default, Machine Learning analyzes log messages in linked projects according to the default project scope for the space. You can configure a different project scope to control which projects are analyzed. Regardless of project scope, analysis results live exclusively in the current project."
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          error={[
            ...(hasError ? [unavailableLabel] : []),
            ...validationErrors.map(formatValidationError),
          ]}
          isInvalid={hasError || validationErrors.length > 0}
          label={projectScopeLabel}
        >
          <ProjectScopeButton
            data-test-subj="infraLogAnalysisSetupProjectScopeButton"
            hasError={hasError}
            isDisabled={disabled}
            isLoading={isButtonLoading}
            label={buttonLabel}
            onClick={openProjectScope}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const formatValidationError = (validationError: ProjectRoutingValidationError): string => {
  switch (validationError.error) {
    case 'MISSING_PROJECT_ROUTING':
      return missingProjectScopeLabel;
  }
};

export const AnalysisSetupProjectScopeForm: FC<AnalysisSetupProjectScopeFormProps> = ({
  isCpsEnabled,
  ...props
}) => {
  const {
    services: { cps },
  } = useKibanaContextForPlugin();
  const cpsManager = cps?.cpsManager;

  if (!isCpsEnabled || !cpsManager) {
    return null;
  }

  return <AnalysisSetupProjectScopeFormInner cpsManager={cpsManager} {...props} />;
};
