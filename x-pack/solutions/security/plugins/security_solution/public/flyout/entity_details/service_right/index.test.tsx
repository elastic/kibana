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
import type { ServicePanelProps } from '.';
import { ServicePanel } from '.';
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
import { mockObservedService } from './mocks';
import { mockServiceRiskScoreState, mockServiceEntityRiskScores } from '../mocks';

const mockProps: ServicePanelProps = {
  serviceName: 'test',
  entityId: 'test-entity-id',
  contextID: 'test-service-panel',
  scopeId: 'test-scope-id',
};

vi.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedUseRiskScore = vi.fn().mockReturnValue(mockServiceRiskScoreState);
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

const mockedUseObservedService = vi.fn().mockReturnValue(mockObservedService);

vi.mock('./hooks/use_observed_service', () => {
      const mocked = {
      useObservedService: () => mockedUseObservedService(),
    };
      return { ...mocked, default: mocked };
    });

const mockedUseIsExperimentalFeatureEnabled = vi.fn().mockReturnValue(true);
vi.mock('../../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: () => mockedUseIsExperimentalFeatureEnabled(),
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

vi.mock('../../../common/utils/timeline/use_show_timeline', () => {
      const mocked = {
      useShowTimeline: vi.fn(() => [true]),
    };
      return { ...mocked, default: mocked };
    });

describe('ServicePanel', () => {
  beforeEach(() => {
    mockedUseRiskScore.mockReturnValue(mockServiceRiskScoreState);
    mockedUseObservedService.mockReturnValue(mockObservedService);
    mockedUseEntityRiskScores.mockReturnValue(mockServiceEntityRiskScores);
    vi.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    vi.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    vi.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <ServicePanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('securitySolutionFlyoutNavigationExpandDetailButton')).toBeInTheDocument();
  });

  it('renders loading state when observed service is loading', () => {
    mockedUseObservedService.mockReturnValue({
      ...mockObservedService,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <ServicePanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
