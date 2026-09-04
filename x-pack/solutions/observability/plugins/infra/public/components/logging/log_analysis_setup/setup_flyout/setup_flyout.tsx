/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useState } from 'react';
import { LogEntryCategoriesSetupProvider } from '../../../../containers/logs/log_analysis/modules/log_entry_categories';
import { LogEntryRateSetupProvider } from '../../../../containers/logs/log_analysis/modules/log_entry_rate';
import type { LoadedProjectScopeProjects } from '../initial_configuration_step';
import { LogEntryCategoriesSetupView } from './log_entry_categories_setup_view';
import { LogEntryRateSetupView } from './log_entry_rate_setup_view';
import { LogAnalysisModuleList } from './module_list';
import { ProjectScopePickerView } from './project_scope_picker_view';
import type { ModuleId } from './setup_flyout_state';
import { moduleIds, useLogAnalysisSetupFlyoutStateContext } from './setup_flyout_state';

const FLYOUT_HEADING_ID = 'logAnalysisSetupFlyoutHeading';
const SCOPE_PICKER_HEADING_ID = 'logAnalysisSetupFlyoutScopePickerHeading';

export const LogAnalysisSetupFlyout: React.FC<{
  allowedModules?: ModuleId[];
}> = ({ allowedModules = moduleIds }) => {
  const { closeFlyout, flyoutView, showModuleList, showModuleSetup } =
    useLogAnalysisSetupFlyoutStateContext();

  const [scopePickerProjects, setScopePickerProjects] = useState<LoadedProjectScopeProjects | null>(
    null
  );
  const isScopePickerVisible = scopePickerProjects !== null;

  useEffect(() => {
    if (flyoutView.view !== 'moduleSetup') {
      setScopePickerProjects(null);
    }
  }, [flyoutView]);

  if (flyoutView.view === 'hidden') {
    return null;
  }

  const getFlyoutContent = () => {
    const content =
      isScopePickerVisible && flyoutView.view === 'moduleSetup' ? (
        <ProjectScopePickerView
          moduleId={flyoutView.module}
          onClose={() => setScopePickerProjects(null)}
          projects={scopePickerProjects}
          titleId={SCOPE_PICKER_HEADING_ID}
        />
      ) : (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2 id={FLYOUT_HEADING_ID}>
                <FormattedMessage
                  id="xpack.infra.logs.analysis.setupFlyoutTitle"
                  defaultMessage="Anomaly detection with Machine Learning"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {flyoutView.view === 'moduleList' ? (
              <LogAnalysisModuleList onViewModuleSetup={showModuleSetup} />
            ) : flyoutView.view === 'moduleSetup' && allowedModules.includes(flyoutView.module) ? (
              <ModuleSetupView
                moduleId={flyoutView.module}
                onClose={closeFlyout}
                onOpenProjectScope={setScopePickerProjects}
                onViewModuleList={allowedModules.length > 1 ? showModuleList : undefined}
              />
            ) : null}
          </EuiFlyoutBody>
        </>
      );

    // Mount the active module's setup state provider above the flyout content, so the
    // configuration state survives swapping the flyout content for the scope picker. The
    // provider requires the module's context from the page, so it must respect the
    // page's allowed modules, like the setup view rendering above does.
    const activeModule =
      flyoutView.view === 'moduleSetup' && allowedModules.includes(flyoutView.module)
        ? flyoutView.module
        : undefined;

    switch (activeModule) {
      case 'logs_ui_categories':
        return (
          <LogEntryCategoriesSetupProvider key={activeModule}>
            {content}
          </LogEntryCategoriesSetupProvider>
        );
      case 'logs_ui_analysis':
        return <LogEntryRateSetupProvider key={activeModule}>{content}</LogEntryRateSetupProvider>;
      default:
        return content;
    }
  };

  return (
    <EuiFlyout
      aria-labelledby={isScopePickerVisible ? SCOPE_PICKER_HEADING_ID : FLYOUT_HEADING_ID}
      maxWidth={800}
      onClose={closeFlyout}
      data-test-subj="infraLogAnalysisSetupFlyout"
    >
      {getFlyoutContent()}
    </EuiFlyout>
  );
};

const ModuleSetupView: React.FC<{
  moduleId: ModuleId;
  onClose: () => void;
  onOpenProjectScope: (projects: LoadedProjectScopeProjects) => void;
  onViewModuleList?: () => void;
}> = ({ moduleId, onClose, onOpenProjectScope, onViewModuleList }) => {
  switch (moduleId) {
    case 'logs_ui_analysis':
      return (
        <LogAnalysisSetupFlyoutSubPage onViewModuleList={onViewModuleList}>
          <LogEntryRateSetupView onClose={onClose} onOpenProjectScope={onOpenProjectScope} />
        </LogAnalysisSetupFlyoutSubPage>
      );
    case 'logs_ui_categories':
      return (
        <LogAnalysisSetupFlyoutSubPage onViewModuleList={onViewModuleList}>
          <LogEntryCategoriesSetupView onClose={onClose} onOpenProjectScope={onOpenProjectScope} />
        </LogAnalysisSetupFlyoutSubPage>
      );
  }
};

const LogAnalysisSetupFlyoutSubPage: FC<
  PropsWithChildren<{
    children: React.ReactNode;
    onViewModuleList?: () => void;
  }>
> = ({ children, onViewModuleList }) => (
  <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
    {onViewModuleList ? (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="infraLogAnalysisSetupFlyoutSubPageAllMachineLearningJobsButton"
          flush="left"
          iconSide="left"
          iconType="chevronSingleLeft"
          onClick={onViewModuleList}
        >
          <FormattedMessage
            id="xpack.infra.logs.analysis.setupFlyoutGotoListButtonLabel"
            defaultMessage="All Machine Learning jobs"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem>{children}</EuiFlexItem>
  </EuiFlexGroup>
);
