/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type { UserPanelProps } from '.';
import { UserPanel } from '.';
import type {
  ExpandableFlyoutApi,
  ExpandableFlyoutState,
  FlyoutPanelHistory,
} from '@kbn/expandable-flyout';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import { mockManagedUserData, mockObservedUser } from './mocks';
import { mockRiskScoreState } from '../../shared/mocks';
import { mockUserEntityRiskScores } from '../mocks';

const mockProps: UserPanelProps = {
  userName: 'test',
  contextID: 'test-user-panel',
  scopeId: 'test-scope-id',
  isPreviewMode: false,
};

vi.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedUseRiskScore = vi.fn().mockReturnValue(mockRiskScoreState);
vi.mock('../../../entity_analytics/api/hooks/use_risk_score', () => {
  const mocked = {
    useRiskScore: () => mockedUseRiskScore(),
  };
  return { ...mocked, default: mocked };
});

const mockedUseEntityRiskScores = vi.fn();
vi.mock('../../../entity_analytics/api/hooks/use_entity_risk_scores', () => {
  const mocked = {
    useEntityRiskScores: () => mockedUseEntityRiskScores(),
  };
  return { ...mocked, default: mocked };
});

const mockedUseManagedUser = vi.fn().mockReturnValue(mockManagedUserData);
const mockedUseObservedUser = vi.fn().mockReturnValue(mockObservedUser);

vi.mock('../shared/hooks/use_managed_user', () => {
  const mocked = {
    useManagedUser: () => mockedUseManagedUser(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../flyout_v2/entity/user/main/hooks/use_observed_user', () => {
  const mocked = {
    useObservedUser: () => mockedUseObservedUser(),
  };
  return { ...mocked, default: mocked };
});

const flyoutContextValue = {
  closeLeftPanel: vi.fn(),
} as unknown as ExpandableFlyoutApi;

const flyoutHistory: FlyoutPanelHistory[] = [
  { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
];
vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn(),
    useExpandableFlyoutHistory: vi.fn(),
    useExpandableFlyoutState: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('UserPanel', () => {
  beforeEach(() => {
    mockedUseRiskScore.mockReturnValue(mockRiskScoreState);
    mockedUseManagedUser.mockReturnValue(mockManagedUserData);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
    mockedUseEntityRiskScores.mockReturnValue(mockUserEntityRiskScores);
    vi.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    vi.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    vi.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
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

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('observedDataSectionLoadingSpinner')).toBeInTheDocument();
  });
});
