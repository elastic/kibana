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
import { mockManagedUserData, mockObservedUser } from './mocks';
import { UserPanelContent } from './content';

const riskScoreData = { ...mockRiskScoreState, data: [] };

export default {
  title: 'Components/UserPanelContent',

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
    <UserPanelContent
      managedUser={mockManagedUserData}
      observedUser={mockObservedUser}
      riskScoreState={riskScoreData}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      userName={'test-user-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'default',
};

export const IntegrationDisabled = {
  render: () => (
    <UserPanelContent
      managedUser={{
        data: undefined,
        isLoading: false,
        isIntegrationEnabled: false,
      }}
      observedUser={mockObservedUser}
      riskScoreState={riskScoreData}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      userName={'test-user-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'integration disabled',
};

export const NoManagedData = {
  render: () => (
    <UserPanelContent
      managedUser={{
        data: undefined,
        isLoading: false,
        isIntegrationEnabled: true,
      }}
      observedUser={mockObservedUser}
      riskScoreState={riskScoreData}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      userName={'test-user-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'no managed data',
};

export const NoObservedData = {
  render: () => (
    <UserPanelContent
      managedUser={mockManagedUserData}
      observedUser={{
        details: {
          user: {
            id: [],
            domain: [],
          },
          host: {
            ip: [],
            os: {
              name: [],
              family: [],
            },
          },
        },
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
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      userName={'test-user-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'no observed data',
};

export const Loading = {
  render: () => (
    <UserPanelContent
      managedUser={{
        data: undefined,
        isLoading: true,
        isIntegrationEnabled: true,
      }}
      observedUser={{
        details: {
          user: {
            id: [],
            domain: [],
          },
          host: {
            ip: [],
            os: {
              name: [],
              family: [],
            },
          },
        },
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
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      openDetailsPanel={() => {}}
      userName={'test-user-name'}
      onAssetCriticalityChange={() => {}}
      recalculatingScore={false}
      isLinkEnabled={true}
    />
  ),

  name: 'loading',
};
