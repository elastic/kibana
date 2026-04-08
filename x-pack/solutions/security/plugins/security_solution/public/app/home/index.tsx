/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { SecuritySolutionAppWrapper } from '../../common/components/page';

import { HelpMenu } from '../../common/components/help_menu';
import { getScopeFromPath } from '../../sourcerer/containers/sourcerer_paths';
import { GlobalHeader } from './global_header';
import { ConsoleManager } from '../../management/components/console/components/console_manager';

import { useUrlState } from '../../common/hooks/use_url_state';
import { useUpdateBrowserTitle } from '../../common/hooks/use_update_browser_title';
import { useUpdateExecutionContext } from '../../common/hooks/use_update_execution_context';
import { useSecuritySolutionInitialization } from '../../common/components/initialization/use_security_solution_initialization';
import {
  INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE,
  INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE,
  INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
  INITIALIZATION_FLOW_INSTALL_DE_RULE_MONITORING_ASSETS,
} from '../../../common/api/initialization';
import { TopValuesPopover } from '../components/top_values_popover/top_values_popover';
import { useInitSourcerer } from '../../sourcerer/containers/use_init_sourcerer';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useRestoreDataViewManagerStateFromURL } from '../../data_view_manager/hooks/use_sync_url_state';
import { useBrowserFields } from '../../data_view_manager/hooks/use_browser_fields';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { type BrowserFields } from '../../common/containers/source';

interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { pathname } = useLocation();
  const { browserFields: oldBrowserFields } = useInitSourcerer(getScopeFromPath(pathname, false));
  const { browserFields: experimentalBrowserFields } = useBrowserFields(
    getScopeFromPath(pathname, newDataViewPickerEnabled)
  );

  useRestoreDataViewManagerStateFromURL(
    useInitDataViewManager(),
    getScopeFromPath(pathname, newDataViewPickerEnabled)
  );

  useUrlState();
  useUpdateBrowserTitle();
  useUpdateExecutionContext();

  const browserFields = (
    newDataViewPickerEnabled ? experimentalBrowserFields : oldBrowserFields
  ) as BrowserFields;

  // Trigger the package installation
  useSecuritySolutionInitialization([
    INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE,
    INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE,
    INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
  ]);

  // Trigger the installation of monitoring assets in parallel
  // since `INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE` blocks until it is finished
  useSecuritySolutionInitialization([INITIALIZATION_FLOW_INSTALL_DE_RULE_MONITORING_ASSETS]);

  return (
    <SecuritySolutionAppWrapper id="security-solution-app" className="kbnAppWrapper">
      <ConsoleManager>
        <>
          <GlobalHeader />
          <DragDropContextWrapper browserFields={browserFields}>{children}</DragDropContextWrapper>
          <HelpMenu />
          <TopValuesPopover />
        </>
      </ConsoleManager>
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
