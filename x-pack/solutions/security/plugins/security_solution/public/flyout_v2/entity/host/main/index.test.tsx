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
  mockHostRiskScoreState,
  mockObservedHostData,
} from '../../../../flyout/entity_details/mocks';
import { Host } from '.';

const mockProps = {
  hostName: 'test',
  scopeId: 'test-scope-id',
  contextID: 'test-host-panel',
};

vi.mock('../../../../common/components/visualization_actions/visualization_embeddable');

const mockedHostRiskScore = vi.fn().mockReturnValue(mockHostRiskScoreState);
vi.mock('../../../../entity_analytics/api/hooks/use_risk_score', () => {
      const mocked = {
      useRiskScore: () => mockedHostRiskScore(),
    };
      return { ...mocked, default: mocked };
    });

const mockedUseObservedHost = vi.fn().mockReturnValue(mockObservedHostData);
vi.mock('./hooks/use_observed_host', () => {
      const mocked = {
      useObservedHost: () => mockedUseObservedHost(),
    };
      return { ...mocked, default: mocked };
    });

describe('<Host />', () => {
  beforeEach(() => {
    mockedHostRiskScore.mockReturnValue(mockHostRiskScoreState);
    mockedUseObservedHost.mockReturnValue(mockObservedHostData);
  });

  it('renders header, content, and footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Host {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header')).toBeInTheDocument();
    expect(getByTestId('observedEntity-accordion')).toBeInTheDocument();
  });

  it('does not render an expand-details navigation button (no v2 left panel yet)', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <Host {...mockProps} />
      </TestProviders>
    );

    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });

  it('does not render a preview footer', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <Host {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('host-preview-footer')).not.toBeInTheDocument();
  });
});
