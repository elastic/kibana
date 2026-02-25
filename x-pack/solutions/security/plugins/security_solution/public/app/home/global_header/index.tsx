/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  ALERTS_PATH,
  ATTACK_DISCOVERY_PATH,
  DASHBOARDS_PATH,
  RULES_PATH,
  SecurityPageName,
  TIMELINES_PATH,
} from '../../../../common/constants';

const RULES_MANAGEMENT_PATH = `${RULES_PATH}/management`;
import { PageScope } from '../../../data_view_manager/constants';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../common/lib/kibana';
import { useNavigateTo } from '../../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import { isDashboardViewPath } from '../../../helpers';
import { getSecurityDashboardsHeaderAppActionsConfig } from '../header_app_actions/header_app_actions_config';
import { Sourcerer } from '../../../sourcerer/components';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { timelineSelectors } from '../../../timelines/store';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import {
  getScopeFromPath,
  showSourcererByPath,
} from '../../../sourcerer/containers/sourcerer_paths';
import { DataViewPicker } from '../../../data_view_manager/components/data_view_picker';
import { getAlertsHeaderAppActionsConfig } from '../header_app_actions/header_app_actions_config';
import { getAttackDiscoveryHeaderAppActionsConfig } from '../header_app_actions/attack_discovery_header_app_actions_config';

// Commented out so the app menu is not dominated by a single "Add integrations" item
// const BUTTON_ADD_DATA = i18n.translate('xpack.securitySolution.globalHeader.buttonAddData', {
//   defaultMessage: 'Add integrations',
// });

/**
 * This component uses the reverse portal to add the Add Data, ML job settings, and AI Assistant buttons on the
 * right hand side of the Kibana global header
 */
export const GlobalHeader = React.memo(() => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const portalNode = useMemo(() => createHtmlPortalNode(), []);
  const {
    theme,
    setHeaderActionMenu,
    i18n: kibanaServiceI18n,
    chrome,
  } = useKibana().services;
  const { pathname } = useLocation();

  const isOnAlertsPage = Boolean(matchPath(pathname, { path: ALERTS_PATH, exact: true }));
  const isOnAttackDiscoveryPage = Boolean(
    matchPath(pathname, { path: ATTACK_DISCOVERY_PATH, exact: true })
  );
  const isOnRulesManagementPage = Boolean(
    matchPath(pathname, { path: RULES_MANAGEMENT_PATH, exact: true })
  );
  const dashboardViewPath = isDashboardViewPath(pathname);
  const isOnSecurityDashboardsLandingPage =
    (pathname === DASHBOARDS_PATH || pathname === `${DASHBOARDS_PATH}/`) && !dashboardViewPath;
  const isOnTimelinesPage = pathname === TIMELINES_PATH || pathname.startsWith(`${TIMELINES_PATH}/`);

  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const onCreateSecurityDashboard = useCallback(() => {
    navigateTo({
      url: getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: 'create',
      }),
    });
  }, [navigateTo, getSecuritySolutionUrl]);

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const showTimeline = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
  );

  const sourcererScope = getScopeFromPath(pathname, newDataViewPickerEnabled);
  const showSourcerer = showSourcererByPath(pathname);

  const hasHeaderContent = showSourcerer && !showTimeline;
  // On Alerts with the new data view picker, the picker lives in the Unified Search bar; don't show it in the app menu.
  const showDataViewPickerInAppMenu =
    hasHeaderContent && !(newDataViewPickerEnabled && sourcererScope === PageScope.alerts);

  useEffect(() => {
    if (chrome?.setHeaderAppActionsConfig) {
      if (isOnAlertsPage) {
        chrome.setHeaderAppActionsConfig(getAlertsHeaderAppActionsConfig());
      } else if (isOnAttackDiscoveryPage) {
        chrome.setHeaderAppActionsConfig(getAttackDiscoveryHeaderAppActionsConfig());
      } else if (isOnRulesManagementPage) {
        // Rules management page sets and clears its own config in RulesPage
        return;
      } else if (isOnSecurityDashboardsLandingPage) {
        chrome.setHeaderAppActionsConfig(
          getSecurityDashboardsHeaderAppActionsConfig(onCreateSecurityDashboard)
        );
      } else if (isOnTimelinesPage) {
        // Timelines page sets and clears its own config in TimelinesPage
        return;
      } else {
        chrome.setHeaderAppActionsConfig(undefined);
      }
      return () => {
        chrome.setHeaderAppActionsConfig(undefined);
      };
    }
  }, [
    chrome,
    isOnAlertsPage,
    isOnAttackDiscoveryPage,
    isOnRulesManagementPage,
    isOnSecurityDashboardsLandingPage,
    isOnTimelinesPage,
    onCreateSecurityDashboard,
  ]);

  useEffect(() => {
    if (!setHeaderActionMenu) return;

    if (showDataViewPickerInAppMenu) {
      setHeaderActionMenu((element) => {
        const mount = toMountPoint(<OutPortal node={portalNode} />, {
          theme,
          i18n: kibanaServiceI18n,
        });
        return mount(element);
      });
    } else {
      setHeaderActionMenu(undefined);
    }

    return () => {
      /* Dashboard mounts an edit toolbar, it should be restored when leaving dashboard editing page */
      if (dashboardViewPath) {
        return;
      }
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [
    showDataViewPickerInAppMenu,
    portalNode,
    setHeaderActionMenu,
    theme,
    kibanaServiceI18n,
    dashboardViewPath,
  ]);

  const dataViewPicker = newDataViewPickerEnabled ? (
    <DataViewPicker scope={sourcererScope} disabled={sourcererScope === PageScope.alerts} />
  ) : (
    <Sourcerer scope={sourcererScope} data-test-subj="sourcerer" />
  );

  return (
    <InPortal node={portalNode}>
      <EuiHeaderSection side="right">
        {/* MlPopover and Add integrations button commented out so the app menu is not dominated by a single item */}

        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            {showSourcerer && !showTimeline && dataViewPicker}
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </InPortal>
  );
});
GlobalHeader.displayName = 'GlobalHeader';
