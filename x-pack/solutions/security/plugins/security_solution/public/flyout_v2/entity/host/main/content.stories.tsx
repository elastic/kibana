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
import { StorybookProviders } from '../../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../../../flyout/shared/mocks';
import { Content } from './content';
import { mockObservedHostData, mockEntityRecord } from '../../../../flyout/entity_details/mocks';

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
    <Content
      observedHost={mockObservedHostData}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      identityFields={{ 'host.name': 'test-host-name' }}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isPreviewMode={false}
    />
  ),

  name: 'default',
};

export const WithGraphVisualization = {
  render: () => (
    <Content
      observedHost={mockObservedHostData}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      identityFields={{ 'host.name': 'test-host-name' }}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isPreviewMode={false}
      entityRecord={mockEntityRecord}
      entityStoreEntityId={mockEntityRecord.entity.id}
    />
  ),

  name: 'with graph visualization',
};

export const NoObservedData = {
  render: () => (
    <Content
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
      }}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      identityFields={{ 'host.name': 'test-host-name' }}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isPreviewMode={false}
    />
  ),

  name: 'no observed data',
};

export const Loading = {
  render: () => (
    <Content
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
      }}
      riskScoreState={riskScoreData}
      contextID={'test-host-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      identityFields={{ 'host.name': 'test-host-name' }}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isPreviewMode={false}
    />
  ),

  name: 'loading',
};
