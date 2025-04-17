/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { EuiFlyout } from '@elastic/eui';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../shared/mocks';
import { HostPanelContent } from './content';
import { mockObservedHostData } from '../mocks';

const riskScoreData = { ...mockRiskScoreState, data: [] };

export default {
  title: 'Components/HostPanelContent',

  decorators: [
    (storyFn) => (
      <StorybookProviders>
        <TestProvider>
          <EuiFlyout size="m" onClose={() => {}}>
            {storyFn()}
          </EuiFlyout>
        </TestProvider>
      </StorybookProviders>
    ),
  ],
} as Meta;

export const Default = {
  render: () => (
    <HostPanelContent
      observedHost={mockObservedHostData}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      hostName={'test-host-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'default',
};

export const NoObservedData = {
  render: () => (
    <HostPanelContent
      observedHost={{
        details: {},
        isLoading: false,
        firstSeen: {
          isLoading: false,
          date: undefined,
        },
        lastSeen: {
          isLoading: false,
          date: undefined,
        },
        anomalies: { isLoading: false, anomalies: null, jobNameById: {} },
      }}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      hostName={'test-host-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'no observed data',
};

export const Loading = {
  render: () => (
    <HostPanelContent
      observedHost={{
        details: {},
        isLoading: true,
        firstSeen: {
          isLoading: true,
          date: undefined,
        },
        lastSeen: {
          isLoading: true,
          date: undefined,
        },
        anomalies: { isLoading: true, anomalies: null, jobNameById: {} },
      }}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      hostName={'test-host-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'loading',
};
