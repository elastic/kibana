/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import type { DocLinks } from '@kbn/doc-links';
import { useUserPrivileges } from '../../../common/components/user_privileges';
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

export const ATTACKS_PAGE_LOADING_TEST_ID = 'attacks-page-loading';

/**
 * Renders the potential callouts, handles missing privileges and the basic loading before
 * the actual content of the attacks page is rendered
 */
export const AttacksPage = memo(() => {
  const [{ loading: userInfoLoading, isAuthenticated, hasIndexRead }] = useUserData();
  const canReadAlerts = useUserPrivileges().rulesPrivileges.rules.read;
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { signalIndexNeedsInit } = useSignalHelpers();

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
    () => !signalIndexNeedsInit && (hasIndexRead === false || canReadAlerts === false),
    [canReadAlerts, hasIndexRead, signalIndexNeedsInit]
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
