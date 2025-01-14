/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlyoutBody, EuiTab, EuiTabs } from '@elastic/eui';
import type { EndpointIndexUIQueryParams } from '../../../types';

import { EndpointDetailsFlyoutHeader } from './flyout_header';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana';

export enum EndpointDetailsTabsTypes {
  overview = 'details',
  activityLog = 'activity_log',
}

export interface EndpointDetailsTabs {
  id: string;
  name: string;
  content: JSX.Element;
  route: string;
}

const EndpointDetailsTab = memo(
  ({ tab, isSelected }: { tab: EndpointDetailsTabs; isSelected: boolean }) => {
    const { getAppUrl } = useAppUrl();
    const onClick = useNavigateByRouterEventHandler(tab.route);
    return (
      <EuiTab
        href={getAppUrl({ path: tab.route })}
        onClick={onClick}
        isSelected={isSelected}
        key={tab.id}
        data-test-subj={`endpoint-details-flyout-tab-${tab.id}`}
      >
        {tab.name}
      </EuiTab>
    );
  }
);

EndpointDetailsTab.displayName = 'EndpointDetailsTab';

interface EndpointDetailsTabsProps {
  hostname: string;
  isHostInfoLoading: boolean;
  show: EndpointIndexUIQueryParams['show'];
  tabs: EndpointDetailsTabs[];
}

export const EndpointDetailsFlyoutTabs = memo<EndpointDetailsTabsProps>(
  ({ hostname, isHostInfoLoading, show, tabs }) => {
    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === show), [tabs, show]);

    const renderTabs = tabs.map((tab) => (
      <EndpointDetailsTab key={tab.id} tab={tab} isSelected={tab.id === selectedTab?.id} />
    ));

    return (
      <>
        <EndpointDetailsFlyoutHeader
          hostname={hostname}
          isHostInfoLoading={isHostInfoLoading}
          hasBorder
        >
          <EuiTabs bottomBorder={false} style={{ marginBottom: '-25px' }}>
            {renderTabs}
          </EuiTabs>
        </EndpointDetailsFlyoutHeader>
        <EuiFlyoutBody
          data-test-subj={`endpoint${
            selectedTab?.id === 'details' ? 'Details' : 'ActivityLog'
          }FlyoutBody`}
        >
          {selectedTab?.content}
        </EuiFlyoutBody>
      </>
    );
  }
);

EndpointDetailsFlyoutTabs.displayName = 'EndpointDetailsFlyoutTabs';
