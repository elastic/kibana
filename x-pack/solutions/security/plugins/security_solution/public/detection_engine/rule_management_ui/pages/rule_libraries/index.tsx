/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../../../app/types';
import { APP_UI_ID } from '../../../../../common';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { getDetectionEngineUrl } from '../../../../common/components/link_to';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { MissingDetectionsPrivilegesCallOut } from '../../../../detections/components/callouts/missing_detections_privileges_callout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { NeedAdminForUpdateRulesCallOut } from '../../../rule_management/components/callouts/need_admin_for_update_rules_callout';
import { redirectToDetections } from '../../../common/helpers';
import { AddLibraryFlyout } from './components/add_library_flyout';
import { ALL_LIBRARIES_ID, LibrariesList } from './components/libraries_list';
import { LibraryBody } from './components/library_body';
import { LibraryRuleFlyout } from './components/library_rule_flyout';
import type { LibraryTab } from './components/library_tabs';
import { DUMMY_EXCEPTION_LISTS, DUMMY_VALUE_LISTS } from './dummy_data';
import { useInstallLibraryRules } from './use_install_library_rules';
import { useLibraryRules } from './use_library_rules';
import {
  useInitialRuleLibrariesPageState,
  useSyncRuleLibrariesUrlState,
} from './use_rule_libraries_url_state';
import { useRuleLibraries } from './use_rule_libraries';
import type { LibraryRuleRow, NewRuleLibraryInput } from './types';
import * as i18n from './translations';

const RuleLibrariesPageComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { navigateToApp } = useKibana().services.application;
  const { rules: rulesPrivileges } = useUserPrivileges().rulesPrivileges;
  const [{ isSignalIndexExists, isAuthenticated, hasEncryptionKey }] = useUserData();
  const { needsConfiguration: needsListsConfiguration } = useListsConfig();

  const { libraries, isLoading, isError, isCreating, refreshLibraries, createLibrary } =
    useRuleLibraries();
  const initialState = useInitialRuleLibrariesPageState();
  const [selectedLibraryId, setSelectedLibraryId] = useState(initialState.libraryId);
  const [selectedTab, setSelectedTab] = useState<LibraryTab>(initialState.tab);
  const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);
  const [openedRule, setOpenedRule] = useState<LibraryRuleRow>();

  const isAllSelected = selectedLibraryId === ALL_LIBRARIES_ID;
  const selectedLibrary = libraries.find(({ id }) => id === selectedLibraryId);
  const inSelectedLibrary = <T extends { libraryId: string }>(items: readonly T[]) =>
    isAllSelected ? items : items.filter(({ libraryId }) => libraryId === selectedLibraryId);

  const refreshedLibraryIds = new Set(
    libraries.filter(({ version }) => Boolean(version)).map(({ id }) => id)
  );
  const inRefreshedLibrary = <T extends { libraryId: string }>(items: readonly T[]) =>
    inSelectedLibrary(items).filter(({ libraryId }) => refreshedLibraryIds.has(libraryId));

  const visibleExceptionLists = inRefreshedLibrary(DUMMY_EXCEPTION_LISTS);
  const visibleValueLists = inRefreshedLibrary(DUMMY_VALUE_LISTS);
  const activeTab =
    (selectedTab === 'exceptionLists' && visibleExceptionLists.length === 0) ||
    (selectedTab === 'valueLists' && visibleValueLists.length === 0)
      ? 'rules'
      : selectedTab;

  const { state: libraryRules, reset: resetLibraryRules } = useLibraryRules({
    libraryId: isAllSelected ? undefined : selectedLibraryId,
    enabled: isAllSelected || Boolean(selectedLibrary?.version),
    initialState,
  });
  const { install, installAll, isInstalling } = useInstallLibraryRules();

  const selectLibrary = useCallback(
    (libraryId: string) => {
      resetLibraryRules();
      setSelectedLibraryId(libraryId);
    },
    [resetLibraryRules]
  );

  // A library from the URL that does not exist, or is not visible here, is replaced by all libraries.
  const isUnknownLibrary = !isLoading && !isError && !isAllSelected && !selectedLibrary;
  useEffect(() => {
    if (isUnknownLibrary) {
      selectLibrary(ALL_LIBRARIES_ID);
      setSelectedTab('rules');
    }
  }, [isUnknownLibrary, selectLibrary]);

  useSyncRuleLibrariesUrlState(
    {
      libraryId: selectedLibraryId,
      tab: activeTab,
      search: libraryRules.query,
      tags: libraryRules.tags,
      tactics: libraryRules.tactics,
      pageIndex: libraryRules.pagination.pageIndex,
      pageSize: libraryRules.pagination.pageSize,
    },
    !isLoading && !isError && !isUnknownLibrary
  );

  const handleAddLibrary = async (input: NewRuleLibraryInput) => {
    const libraryId = await createLibrary(input);
    if (libraryId) {
      selectLibrary(libraryId);
      setIsAddLibraryOpen(false);
    }
  };

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [],
      primaryActionItem: {
        id: 'addRuleLibrary',
        label: i18n.ADD_LIBRARY,
        iconType: 'plusCircle',
        run: () => setIsAddLibraryOpen(true),
        disableButton: !rulesPrivileges.edit,
        testId: 'addRuleLibraryButton',
      },
    }),
    [rulesPrivileges.edit]
  );

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  }

  return (
    <>
      <SecurityAppHeader
        title={i18n.PAGE_TITLE}
        badges={[{ color: 'hollow', label: i18n.EXPERIMENTAL_BADGE }]}
        menu={menu}
        spacing="largeBleed"
      />
      <SecuritySolutionPageWrapper>
        <EuiSpacer size="s" />
        <NeedAdminForUpdateRulesCallOut />
        <MissingDetectionsPrivilegesCallOut />
        {isLoading ? <EuiLoadingSpinner size="xl" data-test-subj="ruleLibrariesLoading" /> : null}
        {isError ? (
          <KbnDangerCallout
            announceOnMount
            title={i18n.LOAD_ERROR_TITLE}
            data-test-subj="ruleLibrariesLoadError"
          />
        ) : null}
        {!isLoading && !isError ? (
          <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} css={{ width: euiTheme.base * 18 }}>
              <LibrariesList
                libraries={libraries}
                selectedId={selectedLibraryId}
                onSelect={selectLibrary}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <LibraryBody
                libraries={libraries}
                selectedLibrary={selectedLibrary}
                selectedLibraryId={selectedLibraryId}
                isAllSelected={isAllSelected}
                rules={libraryRules}
                exceptionLists={visibleExceptionLists}
                valueLists={visibleValueLists}
                activeTab={activeTab}
                canEdit={rulesPrivileges.edit}
                onSelectTab={setSelectedTab}
                onRefresh={refreshLibraries}
                isInstalling={isInstalling}
                onInstall={install}
                onInstallAll={installAll}
                onOpenRule={setOpenedRule}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </SecuritySolutionPageWrapper>
      {openedRule ? (
        <LibraryRuleFlyout
          libraryId={openedRule.libraryId}
          ruleId={openedRule.ruleId}
          canInstall={rulesPrivileges.edit}
          isInstalling={isInstalling}
          onInstall={(rules, enable) => {
            install(rules, enable);
            setOpenedRule(undefined);
          }}
          onClose={() => setOpenedRule(undefined)}
        />
      ) : null}
      {isAddLibraryOpen ? (
        <AddLibraryFlyout
          isSubmitting={isCreating}
          onAdd={handleAddLibrary}
          onClose={() => setIsAddLibraryOpen(false)}
        />
      ) : null}
      <SpyRoute pageName={SecurityPageName.rulesLibraries} />
    </>
  );
};

export const RuleLibrariesPage = React.memo(RuleLibrariesPageComponent);
RuleLibrariesPage.displayName = 'RuleLibrariesPage';
