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
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
  INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
} from '../../../common/api/initialization';
import { TopValuesPopover } from '../components/top_values_popover/top_values_popover';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useRestoreDataViewManagerStateFromURL } from '../../data_view_manager/hooks/use_sync_url_state';
import { useBrowserFields } from '../../data_view_manager/hooks/use_browser_fields';
import { useFlyoutV2RestoreFromUrl } from '../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import {
  FLYOUT_V2_URL_PARAM,
  FLYOUT_V2_TIMELINE_URL_PARAM,
} from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { useLegacyFlyoutUrlInterop } from '../../flyout_v2/shared/url_state/use_expandable_flyout_url_interop';
import { URL_PARAM_KEY } from '../../common/hooks/constants';

interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const { pathname } = useLocation();
  const browserFields = useBrowserFields(getScopeFromPath(pathname));

  useRestoreDataViewManagerStateFromURL(useInitDataViewManager(), getScopeFromPath(pathname));

  useUrlState();
  // Interop must run before the restore hook so the legacy param is consumed first.
  useLegacyFlyoutUrlInterop(URL_PARAM_KEY.flyout, FLYOUT_V2_URL_PARAM);
  useLegacyFlyoutUrlInterop(URL_PARAM_KEY.timelineFlyout, FLYOUT_V2_TIMELINE_URL_PARAM);
  useFlyoutV2RestoreFromUrl(FLYOUT_V2_URL_PARAM);
  useFlyoutV2RestoreFromUrl(FLYOUT_V2_TIMELINE_URL_PARAM);
  useUpdateBrowserTitle();
  useUpdateExecutionContext();

  // Initialize dependencies of certain Security Solution areas and features
  useSecuritySolutionInitialization([
    INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
    INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
    INITIALIZATION_FLOW_INIT_AI_PROMPTS,
    INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
  ]);

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
