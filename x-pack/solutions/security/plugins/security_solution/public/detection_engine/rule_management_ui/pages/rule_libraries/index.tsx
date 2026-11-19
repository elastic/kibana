/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
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
import { LibraryHeader } from './components/library_header';
import { LibraryListsPlaceholder } from './components/library_lists_placeholder';
import { LibraryNotRefreshed } from './components/library_not_refreshed';
import { LibraryRulesTable } from './components/library_rules_table';
import { LibraryTabs } from './components/library_tabs';
import type { LibraryTab } from './components/library_tabs';
import {
  DUMMY_EXCEPTION_LISTS,
  DUMMY_LIBRARIES,
  DUMMY_RULES,
  DUMMY_VALUE_LISTS,
} from './dummy_data';
import type { LibraryRuleRow, NewRuleLibraryInput, RuleLibraryListItem } from './types';
import * as i18n from './translations';

const FAKE_REFRESH_DURATION_MS = 1500;
const FIRST_REFRESH_VERSION = '1.0.0';

const getLibraryTitleFromUrl = (url: string): string =>
  url
    .replace(/\.git$/, '')
    .split(/[/:]/)
    .filter(Boolean)
    .pop() ?? url;

const RuleLibrariesPageComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { navigateToApp } = useKibana().services.application;
  const { rules: rulesPrivileges } = useUserPrivileges().rulesPrivileges;
  const [{ isSignalIndexExists, isAuthenticated, hasEncryptionKey }] = useUserData();
  const { needsConfiguration: needsListsConfiguration } = useListsConfig();

  const [libraries, setLibraries] = useState<readonly RuleLibraryListItem[]>(DUMMY_LIBRARIES);
  const [rules, setRules] = useState<readonly LibraryRuleRow[]>(DUMMY_RULES);
  const [selectedLibraryId, setSelectedLibraryId] = useState(ALL_LIBRARIES_ID);
  const [selectedTab, setSelectedTab] = useState<LibraryTab>('rules');
  const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);

  const isAllSelected = selectedLibraryId === ALL_LIBRARIES_ID;
  const selectedLibrary = libraries.find(({ id }) => id === selectedLibraryId);
  const inSelectedLibrary = <T extends { libraryId: string }>(items: readonly T[]) =>
    isAllSelected ? items : items.filter(({ libraryId }) => libraryId === selectedLibraryId);

  const refreshedLibraryIds = new Set(
    libraries.filter(({ version }) => Boolean(version)).map(({ id }) => id)
  );
  const inRefreshedLibrary = <T extends { libraryId: string }>(items: readonly T[]) =>
    inSelectedLibrary(items).filter(({ libraryId }) => refreshedLibraryIds.has(libraryId));

  const visibleRules = inRefreshedLibrary(rules);
  const visibleExceptionLists = inRefreshedLibrary(DUMMY_EXCEPTION_LISTS);
  const visibleValueLists = inRefreshedLibrary(DUMMY_VALUE_LISTS);
  const isSelectedLibraryNeverRefreshed = Boolean(selectedLibrary && !selectedLibrary.version);
  const activeTab =
    (selectedTab === 'exceptionLists' && visibleExceptionLists.length === 0) ||
    (selectedTab === 'valueLists' && visibleValueLists.length === 0)
      ? 'rules'
      : selectedTab;

  const refreshLibraries = (libraryIds?: string[]) => {
    const isTarget = ({ id }: RuleLibraryListItem) => !libraryIds || libraryIds.includes(id);
    setLibraries((current) =>
      current.map((library) =>
        isTarget(library) ? { ...library, refreshStatus: 'refreshing' } : library
      )
    );
    setTimeout(() => {
      setLibraries((current) =>
        current.map((library) =>
          isTarget(library)
            ? {
                ...library,
                refreshStatus: 'refreshed',
                refreshedAt: new Date().toISOString(),
                version: library.version ?? FIRST_REFRESH_VERSION,
                ruleCount: library.version
                  ? library.ruleCount
                  : rules.filter(({ libraryId }) => libraryId === library.id).length,
              }
            : library
        )
      );
    }, FAKE_REFRESH_DURATION_MS);
  };

  const addLibrary = (input: NewRuleLibraryInput) => {
    const id = uuidv4();
    const newLibrary: RuleLibraryListItem = {
      id,
      group: 'custom',
      title: getLibraryTitleFromUrl(input.url),
      description: '',
      icon: 'package',
      provider: input.source === 's3' ? 's3' : 'git',
      ruleCount: 0,
      refreshStatus: 'never_refreshed',
      owner: 'Custom',
      license: '',
      scope: input.scope,
      sourceUrl: input.url.replace(/^https?:\/\//, ''),
      branch: input.branch || undefined,
    };
    setLibraries((current) => [...current, newLibrary]);
    setSelectedLibraryId(id);
    setIsAddLibraryOpen(false);
  };

  const installRules = (ruleIds: string[]) => {
    setRules((current) =>
      current.map((rule) =>
        ruleIds.includes(rule.id) ? { ...rule, installState: 'installed' } : rule
      )
    );
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

  const isAnyRefreshing = libraries.some(({ refreshStatus }) => refreshStatus === 'refreshing');

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
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false} css={{ width: euiTheme.base * 18 }}>
            <LibrariesList
              libraries={libraries}
              selectedId={selectedLibraryId}
              onSelect={setSelectedLibraryId}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {selectedLibrary ? (
              <>
                <LibraryHeader
                  library={selectedLibrary}
                  listCounts={{
                    exceptionLists: visibleExceptionLists.length,
                    valueLists: visibleValueLists.length,
                  }}
                  canRefresh={rulesPrivileges.edit}
                  onRefresh={(libraryId) => refreshLibraries([libraryId])}
                />
                <EuiSpacer size="m" />
              </>
            ) : null}
            <LibraryTabs
              activeTab={activeTab}
              counts={{
                rules: visibleRules.length,
                exceptionLists: visibleExceptionLists.length,
                valueLists: visibleValueLists.length,
              }}
              onSelect={setSelectedTab}
            />
            {isSelectedLibraryNeverRefreshed && selectedLibrary ? (
              <LibraryNotRefreshed
                isRefreshing={selectedLibrary.refreshStatus === 'refreshing'}
                canRefresh={rulesPrivileges.edit}
                onRefresh={() => refreshLibraries([selectedLibrary.id])}
              />
            ) : null}
            {!isSelectedLibraryNeverRefreshed && activeTab === 'rules' ? (
              <LibraryRulesTable
                key={selectedLibraryId}
                rules={visibleRules}
                libraries={libraries}
                canInstall={rulesPrivileges.edit}
                canRefresh={rulesPrivileges.edit}
                isRefreshingAll={isAnyRefreshing}
                onRefreshAll={isAllSelected ? () => refreshLibraries() : undefined}
                onInstall={installRules}
              />
            ) : null}
            {!isSelectedLibraryNeverRefreshed && activeTab !== 'rules' ? (
              <LibraryListsPlaceholder
                key={activeTab}
                kind={activeTab}
                rows={activeTab === 'exceptionLists' ? visibleExceptionLists : visibleValueLists}
                libraries={libraries}
              />
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
      {isAddLibraryOpen ? (
        <AddLibraryFlyout onAdd={addLibrary} onClose={() => setIsAddLibraryOpen(false)} />
      ) : null}
      <SpyRoute pageName={SecurityPageName.rulesLibraries} />
    </>
  );
};

export const RuleLibrariesPage = React.memo(RuleLibrariesPageComponent);
RuleLibrariesPage.displayName = 'RuleLibrariesPage';
