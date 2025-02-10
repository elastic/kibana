/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type { UserPanelProps } from '.';
import { UserPanel } from '.';
import type {
  ExpandableFlyoutApi,
  ExpandableFlyoutState,
  FlyoutPanelProps,
} from '@kbn/expandable-flyout';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import { mockManagedUserData, mockObservedUser } from './mocks';
import { mockRiskScoreState } from '../../shared/mocks';

const mockProps: UserPanelProps = {
  userName: 'test',
  contextID: 'test-user-panel',
  scopeId: 'test-scope-id',
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedUseRiskScore = jest.fn().mockReturnValue(mockRiskScoreState);
jest.mock('../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockedUseRiskScore(),
}));

const mockedUseManagedUser = jest.fn().mockReturnValue(mockManagedUserData);
const mockedUseObservedUser = jest.fn().mockReturnValue(mockObservedUser);

jest.mock('../shared/hooks/use_managed_user', () => ({
  useManagedUser: () => mockedUseManagedUser(),
}));

jest.mock('./hooks/use_observed_user', () => ({
  useObservedUser: () => mockedUseObservedUser(),
}));

const mockedUseIsExperimentalFeatureEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockedUseIsExperimentalFeatureEnabled(),
}));

const flyoutContextValue = {
  closeLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const flyoutHistory = [{ id: 'id1', params: {} }] as unknown as FlyoutPanelProps[];
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
}));

describe('UserPanel', () => {
  beforeEach(() => {
    mockedUseRiskScore.mockReturnValue(mockRiskScoreState);
    mockedUseManagedUser.mockReturnValue(mockManagedUserData);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('securitySolutionFlyoutNavigationExpandDetailButton')).toBeInTheDocument();
  });

  it('renders loading state when observed user is loading', () => {
    mockedUseObservedUser.mockReturnValue({
      ...mockObservedUser,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('does not render managed user when experimental flag is disabled', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { queryByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-accordion-button')).not.toBeInTheDocument();
  });

  it('renders loading state when managed user is loading', () => {
    mockedUseManagedUser.mockReturnValue({
      ...mockManagedUserData,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
