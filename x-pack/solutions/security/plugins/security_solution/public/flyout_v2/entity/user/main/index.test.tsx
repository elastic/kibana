/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import {
  mockUserEntityRiskScores,
  mockUserRiskScoreState,
} from '../../../../flyout/entity_details/mocks';
import {
  mockObservedUser,
  mockManagedUserData,
} from '../../../../flyout/entity_details/user_right/mocks';
import { User } from '.';

const mockProps = {
  userName: 'test',
  scopeId: 'test-scope-id',
  contextID: 'test-user-panel',
};

vi.mock('../../../../common/components/visualization_actions/visualization_embeddable');

const mockedUserRiskScore = vi.fn().mockReturnValue(mockUserRiskScoreState);
vi.mock('../../../../entity_analytics/api/hooks/use_risk_score', () => {
      const mocked = {
      useRiskScore: () => mockedUserRiskScore(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation', () => {
      const mocked = {
      useEntityRiskScoreRecalculation: () => ({
        entityRiskScores: mockUserEntityRiskScores,
        recalculatingScore: false,
        calculateEntityRiskScore: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockedUseObservedUser = vi.fn().mockReturnValue(mockObservedUser);
vi.mock('./hooks/use_observed_user', () => {
      const mocked = {
      useObservedUser: () => mockedUseObservedUser(),
    };
      return { ...mocked, default: mocked };
    });

const mockedUseManagedUser = vi.fn().mockReturnValue(mockManagedUserData);
vi.mock('../../../../flyout/entity_details/shared/hooks/use_managed_user', () => {
      const mocked = {
      useManagedUser: () => mockedUseManagedUser(),
    };
      return { ...mocked, default: mocked };
    });

describe('<User />', () => {
  beforeEach(() => {
    mockedUserRiskScore.mockReturnValue(mockUserRiskScoreState);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
    mockedUseManagedUser.mockReturnValue(mockManagedUserData);
  });

  it('renders header, content, and footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
    expect(getByTestId('observedEntity-accordion')).toBeInTheDocument();
  });

  it('does not render an expand-details navigation button (no v2 left panel yet)', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });

  it('does not render a preview footer', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('user-preview-footer')).not.toBeInTheDocument();
  });
});
