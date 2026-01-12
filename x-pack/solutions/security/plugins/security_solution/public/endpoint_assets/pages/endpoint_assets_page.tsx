/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useSourcererDataView } from '../../sourcerer/containers';
import { EndpointAssetsHeader } from '../components/endpoint_assets_header';
import { EndpointAssetsTable } from '../components/endpoint_assets_table';
import { PostureOverview } from '../components/posture_overview';
import { PrivilegesOverview } from '../components/privileges_overview';
import { useEndpointAssets } from '../hooks/use_endpoint_assets';
import * as i18n from './translations';
import { TEST_SUBJECTS } from '../../../common/endpoint_assets';

type TabId = 'inventory' | 'posture' | 'privileges' | 'drift';

const EndpointAssetsPageComponent: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState<TabId>('inventory');
  const { sourcererDataView: dataView, loading: sourcererLoading } = useSourcererDataView();

  const { assets, loading, error, refresh, summary } = useEndpointAssets();

  const tabs: Array<{ id: TabId; name: string; content: React.ReactNode }> = [
    {
      id: 'inventory',
      name: i18n.TAB_INVENTORY,
      content: <EndpointAssetsTable assets={assets} loading={loading} />,
    },
    {
      id: 'posture',
      name: i18n.TAB_POSTURE,
      content: <PostureOverview />,
    },
    {
      id: 'privileges',
      name: i18n.TAB_PRIVILEGES,
      content: <PrivilegesOverview />,
    },
    {
      id: 'drift',
      name: i18n.TAB_DRIFT,
      content: <div>Drift detection coming soon...</div>,
    },
  ];

  const selectedTabContent = tabs.find((tab) => tab.id === selectedTab)?.content;

  if (sourcererLoading) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" data-test-subj={TEST_SUBJECTS.LOADING} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="endpointAssetsPage">
        <HeaderPage
          title={i18n.PAGE_TITLE}
          subtitle={i18n.PAGE_SUBTITLE}
          data-test-subj={TEST_SUBJECTS.PAGE_TITLE}
        />

        <EuiFlexGroup direction="column">
          {/* Summary Header */}
          <EuiFlexItem>
            <EndpointAssetsHeader
              totalAssets={summary?.total || 0}
              activeAssets={summary?.active24h || 0}
              criticalPosture={summary?.criticalPosture || 0}
              elevatedPrivileges={summary?.elevatedPrivileges || 0}
              recentlyChanged={summary?.recentlyChanged || 0}
              onRefresh={refresh}
              loading={loading}
            />
          </EuiFlexItem>

          <EuiSpacer size="l" />

          {/* Tab Navigation */}
          <EuiFlexItem>
            <EuiTabs>
              {tabs.map((tab) => (
                <EuiTab
                  key={tab.id}
                  isSelected={selectedTab === tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>

          <EuiSpacer size="l" />

          {/* Tab Content */}
          <EuiFlexItem>
            {error ? (
              <div>Error loading assets: {error.message}</div>
            ) : (
              selectedTabContent
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.endpointAssets} />
    </>
  );
};

export const EndpointAssetsPage = React.memo(EndpointAssetsPageComponent);
EndpointAssetsPage.displayName = 'EndpointAssetsPage';
