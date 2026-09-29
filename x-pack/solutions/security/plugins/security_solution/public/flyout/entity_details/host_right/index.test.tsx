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
import { mockHostRiskScoreState, mockObservedHostData, mockHostEntityRiskScores } from '../mocks';
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
import type { HostPanelProps } from '.';
import { HostPanel } from '.';

const mockProps: HostPanelProps = {
  hostName: 'test',
  contextID: 'test-host -panel',
  scopeId: 'test-scope-id',
  isPreviewMode: false,
};

vi.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedHostRiskScore = vi.fn().mockReturnValue(mockHostRiskScoreState);
vi.mock('../../../entity_analytics/api/hooks/use_risk_score', () => {
  const mocked = {
    useRiskScore: () => mockedHostRiskScore(),
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

const mockedUseObservedHost = vi.fn().mockReturnValue(mockObservedHostData);

vi.mock('../../../flyout_v2/entity/host/main/hooks/use_observed_host', () => {
  const mocked = {
    useObservedHost: () => mockedUseObservedHost(),
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

describe('HostPanel', () => {
  beforeEach(() => {
    mockedHostRiskScore.mockReturnValue(mockHostRiskScoreState);
    mockedUseObservedHost.mockReturnValue(mockObservedHostData);
    mockedUseEntityRiskScores.mockReturnValue(mockHostEntityRiskScores);
    vi.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    vi.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    vi.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('renders', () => {
    mockedUseObservedHost.mockReturnValue({
      ...mockObservedHostData,
      entityRecord: {
        '@timestamp': '2024-01-15T10:00:00.000Z',
        entity: {
          id: 'host-entity-id',
          name: 'test',
          type: 'host',
          risk: {
            calculated_level: 'High',
            calculated_score: 80,
            calculated_score_norm: 80,
          },
        },
        host: { name: 'test' },
      },
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <HostPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('securitySolutionFlyoutNavigationExpandDetailButton')).toBeInTheDocument();
    expect(queryByTestId('host-preview-footer')).not.toBeInTheDocument();
  });

  it('renders loading state when observed host is loading', () => {
    mockedUseObservedHost.mockReturnValue({
      ...mockObservedHostData,
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <HostPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('observedDataSectionLoadingSpinner')).toBeInTheDocument();
  });

  it('renders preview panel', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <HostPanel {...mockProps} isPreviewMode />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header')).toBeInTheDocument();
    expect(getByTestId('host-preview-footer')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });
});
