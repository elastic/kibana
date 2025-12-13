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
import { useUpgradeSecurityPackages } from '../../detection_engine/rule_management/logic/use_upgrade_security_packages';
import { useSetupDetectionEngineHealthApi } from '../../detection_engine/rule_monitoring';
import { TopValuesPopover } from '../components/top_values_popover/top_values_popover';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useRestoreDataViewManagerStateFromURL } from '../../data_view_manager/hooks/use_sync_url_state';
import { useBrowserFields } from '../../data_view_manager/hooks/use_browser_fields';

interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const { pathname } = useLocation();
  const browserFields = useBrowserFields(getScopeFromPath(pathname));

  useRestoreDataViewManagerStateFromURL(useInitDataViewManager(), getScopeFromPath(pathname));

  useUrlState();
  useUpdateBrowserTitle();
  useUpdateExecutionContext();

  // side effect: this will attempt to upgrade the endpoint package if it is not up to date
  // this will run when a user navigates to the Security Solution app and when they navigate between
  // tabs in the app. This is useful for keeping the endpoint package as up to date as possible until
  // a background task solution can be built on the server side. Once a background task solution is available we
  // can remove this.
  useUpgradeSecurityPackages();
  useSetupDetectionEngineHealthApi();

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
