/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import React, { memo, useEffect, useMemo } from 'react';
import type { DocLinks } from '@kbn/doc-links';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from 'react-redux';
import { Wrapper } from '../../components/attacks/wrapper';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { NoApiIntegrationKeyCallOut } from '../../components/callouts/no_api_integration_key_callout';
import { useUserData } from '../../components/user_info';
import { NoIndexEmptyPage } from '../../components/alerts/empty_pages/no_index_empty_page';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { UserUnauthenticatedEmptyPage } from '../../components/alerts/empty_pages/user_unauthenticated_empty_page';
import * as i18n from './translations';
import { useSignalHelpers } from '../../../sourcerer/containers/use_signal_helpers';
import { NeedAdminForUpdateRulesCallOut } from '../../../detection_engine/rule_management/components/callouts/need_admin_for_update_rules_callout';
import { MissingAttacksPrivilegesCallOut } from '../../components/callouts/missing_attacks_privileges_callout';
import { NoPrivileges } from '../../../common/components/no_privileges';
import { HeaderPage } from '../../../common/components/header_page';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../common/lib/kibana';
import { AttackDetailsFlyout } from '../../../flyout_v2/attack_details/main/attack_details_flyout';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { ATTACK_ID_URL_PARAM, ATTACK_INDEX_URL_PARAM } from './utils';

export const ATTACKS_PAGE_LOADING_TEST_ID = 'attacks-page-loading';

/**
 * Reads the V2 deep-link redirect params (`attackId` + `index`) from the URL
 * on mount; when both are present and `newFlyoutSystemEnabled` is on,
 * imperatively opens the V2 attack-details flyout and strips the two params
 * from the URL via `history.replace`. After stripping, the effect re-runs
 * with the cleaned `location.search` and early-returns. Legacy mode
 * (`newFlyoutSystemEnabled` off) leaves the URL alone — the legacy `flyout`
 * URL param is consumed by the expandable-flyout machinery elsewhere.
 */
const useAttackDetailsDeepLinkOpener = () => {
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const location = useLocation();
  const history = useHistory();
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

  useEffect(() => {
    if (!newFlyoutSystemEnabled) return;
    const searchParams = new URLSearchParams(location.search);
    const attackId = searchParams.get(ATTACK_ID_URL_PARAM);
    const indexName = searchParams.get(ATTACK_INDEX_URL_PARAM);
    if (!attackId || !indexName) return;
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <AttackDetailsFlyout attackId={attackId} indexName={indexName} />,
      }),
      {
        ...defaultFlyoutProperties,
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      }
    );
    searchParams.delete(ATTACK_ID_URL_PARAM);
    searchParams.delete(ATTACK_INDEX_URL_PARAM);
    const nextSearch = searchParams.toString();
    history.replace({
      ...location,
      search: nextSearch ? `?${nextSearch}` : '',
    });
  }, [
    defaultFlyoutProperties,
    history,
    location,
    newFlyoutSystemEnabled,
    overlays,
    services,
    store,
  ]);
};

/**
 * Renders the potential callouts, handles missing privileges and the basic loading before
 * the actual content of the attacks page is rendered
 */
export const AttacksPage = memo(() => {
  const [{ loading: userInfoLoading, isAuthenticated }] = useUserData();
  const { hasAlertsRead: canReadAlerts } = useAlertsPrivileges();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { signalIndexNeedsInit } = useSignalHelpers();
  useAttackDetailsDeepLinkOpener();

  const loading: boolean = useMemo(
    () => userInfoLoading || listsConfigLoading,
    [listsConfigLoading, userInfoLoading]
  );
  const userNotAuthenticated: boolean = useMemo(
    () => isAuthenticated != null && !isAuthenticated,
    [isAuthenticated]
  );
  const noIndex: boolean = useMemo(
    () => signalIndexNeedsInit || needsListsConfiguration,
    [needsListsConfiguration, signalIndexNeedsInit]
  );
  const privilegesRequired: boolean = useMemo(
    () => !signalIndexNeedsInit && canReadAlerts === false,
    [canReadAlerts, signalIndexNeedsInit]
  );

  if (loading) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} isLoading={loading} />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner data-test-subj={ATTACKS_PAGE_LOADING_TEST_ID} size="xl" />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  if (userNotAuthenticated) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <UserUnauthenticatedEmptyPage />
      </SecuritySolutionPageWrapper>
    );
  }

  if (noIndex) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <NoIndexEmptyPage
          needsListsIndex={needsListsConfiguration}
          needsSignalsIndex={signalIndexNeedsInit}
        />
      </SecuritySolutionPageWrapper>
    );
  }

  return (
    <>
      <NoApiIntegrationKeyCallOut />
      <NeedAdminForUpdateRulesCallOut />
      <MissingAttacksPrivilegesCallOut />
      {privilegesRequired ? (
        <NoPrivileges
          pageName={i18n.PAGE_TITLE.toLowerCase()}
          docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges}
        />
      ) : (
        <Wrapper />
      )}
    </>
  );
});

AttacksPage.displayName = 'AttacksPage';
