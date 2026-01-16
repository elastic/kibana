/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiLoadingSpinner,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { OverviewTab } from '../../../../entity_analytics/pages/host_details/tabs/overview_tab';
import { PostureTab } from '../../../../entity_analytics/pages/host_details/tabs/posture_tab';
import { PrivilegesTab } from '../../../../entity_analytics/pages/host_details/tabs/privileges_tab';
import { SoftwareTab } from '../../../../entity_analytics/pages/host_details/tabs/software_tab';
import { DriftOverview } from '../../../../endpoint_assets/components/drift_overview';
import type { HostDetailsData } from '../../../entity_details/endpoint_assets/types';

const TAB_OVERVIEW = i18n.translate(
  'xpack.securitySolution.flyout.entities.endpointAssets.tabs.overview',
  { defaultMessage: 'Overview' }
);

const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.flyout.entities.endpointAssets.tabs.drift',
  { defaultMessage: 'Drift' }
);

const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.flyout.entities.endpointAssets.tabs.posture',
  { defaultMessage: 'Security Posture' }
);

const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.flyout.entities.endpointAssets.tabs.privileges',
  { defaultMessage: 'Privileges' }
);

const TAB_SOFTWARE = i18n.translate(
  'xpack.securitySolution.flyout.entities.endpointAssets.tabs.software',
  { defaultMessage: 'Software' }
);

type EndpointAssetsSubTab = 'overview' | 'drift' | 'posture' | 'privileges' | 'software';

interface SubTab {
  id: EndpointAssetsSubTab;
  label: string;
}

const SUB_TABS: SubTab[] = [
  { id: 'overview', label: TAB_OVERVIEW },
  { id: 'drift', label: TAB_DRIFT },
  { id: 'posture', label: TAB_POSTURE },
  { id: 'privileges', label: TAB_PRIVILEGES },
  { id: 'software', label: TAB_SOFTWARE },
];

export interface EndpointAssetsSectionProps {
  hostName: string;
  endpointAssetData: HostDetailsData | null;
  isLoading: boolean;
}

export const ENDPOINT_ASSETS_SECTION_TEST_ID = 'endpoint-assets-section';

/**
 * Endpoint Assets section with tabs for Overview, Posture, Drift, Privileges
 * Designed to be embedded in the Insights > Entities view
 */
export const EndpointAssetsSection: React.FC<EndpointAssetsSectionProps> = React.memo(
  ({ hostName, endpointAssetData, isLoading }) => {
    const [selectedSubTab, setSelectedSubTab] = useState<EndpointAssetsSubTab>('overview');

    const handleSubTabClick = useCallback((tabId: EndpointAssetsSubTab) => {
      setSelectedSubTab(tabId);
    }, []);

    const hostId = useMemo(
      () => endpointAssetData?.entity?.id || endpointAssetData?.host?.id || hostName,
      [endpointAssetData, hostName]
    );

    const renderTabContent = useCallback(() => {
      if (!endpointAssetData) return null;

      switch (selectedSubTab) {
        case 'overview':
          return <OverviewTab hostId={hostId} hostData={endpointAssetData} />;
        case 'drift':
          return <DriftOverview hostId={hostId} />;
        case 'posture':
          return <PostureTab hostId={hostId} postureData={endpointAssetData.endpoint?.posture} />;
        case 'privileges':
          return (
            <PrivilegesTab hostId={hostId} privilegesData={endpointAssetData.endpoint?.privileges} />
          );
        case 'software':
          return (
            <SoftwareTab
              hostId={hostId}
              installedCount={endpointAssetData.endpoint?.software?.installed_count}
              servicesCount={endpointAssetData.endpoint?.software?.services_count}
            />
          );
        default:
          return <OverviewTab hostId={hostId} hostData={endpointAssetData} />;
      }
    }, [selectedSubTab, endpointAssetData, hostId]);

    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: 100 }}
          data-test-subj={`${ENDPOINT_ASSETS_SECTION_TEST_ID}-loading`}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!endpointAssetData) {
      return null;
    }

    return (
      <div data-test-subj={ENDPOINT_ASSETS_SECTION_TEST_ID}>
        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entities.endpointAssets.title"
              defaultMessage="Endpoint Assets"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTabs size="s">
          {SUB_TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => handleSubTabClick(tab.id)}
              isSelected={selectedSubTab === tab.id}
              data-test-subj={`${ENDPOINT_ASSETS_SECTION_TEST_ID}-tab-${tab.id}`}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        {renderTabContent()}
      </div>
    );
  }
);

EndpointAssetsSection.displayName = 'EndpointAssetsSection';
