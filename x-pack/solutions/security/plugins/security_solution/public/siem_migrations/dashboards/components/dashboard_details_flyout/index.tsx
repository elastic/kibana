/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiFlyoutProps,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  CLOSE_BUTTON_LABEL,
  SUMMARY_TAB_LABEL,
} from '../../../common/components/details_flyout/translation';
import {
  ScrollableFlyoutTabbedContent,
  TabContentPadding,
} from '../../../common/components/details_flyout/utils';
import { SummaryTab } from './tabs/summary';
import { UpdatedByLabel } from '../../../common/components/updated_by_label';

export interface DashboardMigrationDashboardDetailsFlyoutProps {
  migrationDashboard: DashboardMigrationDashboard;
  closeFlyout: () => void;
  size?: EuiFlyoutProps['size'];
  isLoading?: boolean;
  dashboardActions?: React.ReactNode;
}

export const DashboardMigrationDetailsFlyout = React.memo(function DashboardMigrationDetailsFlyout({
  migrationDashboard,
  closeFlyout,
  size,
  isLoading = false,
  dashboardActions,
}: DashboardMigrationDashboardDetailsFlyoutProps) {
  const summaryTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'summary',
      name: SUMMARY_TAB_LABEL,
      content: (
        <TabContentPadding>
          <SummaryTab migrationDashboard={migrationDashboard} />
        </TabContentPadding>
      ),
    }),
    [migrationDashboard]
  );

  const tabs = useMemo(() => {
    return [summaryTab];
  }, [summaryTab]);

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  const onTabClick = useCallback(
    (tab: EuiTabbedContentTab) => {
      setSelectedTabId(tab.id);
    },
    [setSelectedTabId]
  );

  const tabsContent = useMemo(() => {
    return (
      <ScrollableFlyoutTabbedContent
        tabs={tabs}
        selectedTab={selectedTab}
        onTabClick={onTabClick}
      />
    );
  }, [selectedTab, tabs, onTabClick]);

  const migrationsDashboardsFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'migrationDashboardsFlyoutTitle',
  });

  return (
    <EuiFlyout
      size={size}
      onClose={closeFlyout}
      paddingSize="l"
      key="migration-dashboard-flyout"
      aria-labelledby={migrationsDashboardsFlyoutTitleId}
      data-test-subj="dashboardDetailsFlyout"
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="detailsFlyoutTitle">
          <h2 id={migrationsDashboardsFlyoutTitleId}>
            {migrationDashboard.elastic_dashboard?.title ||
              migrationDashboard.original_dashboard.title}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <UpdatedByLabel
          updatedBy={migrationDashboard.updated_by ?? migrationDashboard.created_by}
          updatedAt={migrationDashboard.updated_at ?? migrationDashboard['@timestamp']}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSkeletonLoading
          isLoading={isLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={tabsContent}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={closeFlyout}
              flush="left"
              data-test-subj="detailsFlyoutCloseButton"
            >
              {CLOSE_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{dashboardActions}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
