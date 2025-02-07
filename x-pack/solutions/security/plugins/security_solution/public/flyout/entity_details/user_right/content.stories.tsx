/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiFlyout } from '@elastic/eui';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../shared/mocks';
import { mockManagedUserData, mockObservedUser } from './mocks';
import { UserPanelContent } from './content';

const riskScoreData = { ...mockRiskScoreState, data: [] };

storiesOf('Components/UserPanelContent', module)
  .addDecorator((storyFn) => (
    <StorybookProviders>
      <TestProvider>
        <EuiFlyout size="m" onClose={() => {}}>
          {storyFn()}
        </EuiFlyout>
      </TestProvider>
    </StorybookProviders>
  ))
  .add('default', () => (
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
  ))
  .add('integration disabled', () => (
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
  ))
  .add('no managed data', () => (
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
  ))
  .add('no observed data', () => (
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
  ))
  .add('loading', () => (
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
  ));
