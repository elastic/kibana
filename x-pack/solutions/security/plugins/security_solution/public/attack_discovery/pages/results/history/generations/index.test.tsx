/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Generations } from '.';
import { TestProviders } from '../../../../../common/mock';
import { getMockConnectors } from '../../../mock/mock_connectors';
import { getMockGenerations } from '../../../mock/mock_generations';
import { LoadingCallout } from '../../../loading_callout';

const mockFutureTime = '2025-05-19T23:20:15.933Z';

jest.mock('./get_approximate_future_time', () => ({
  getApproximateFutureTime: jest.fn(() => new Date(mockFutureTime)),
}));
jest.mock('../../../utils/get_connector_name_from_id', () => ({
  getConnectorNameFromId: jest.fn(() => 'Mock Connector Name'),
}));
jest.mock('../../../loading_callout', () => ({
  LoadingCallout: jest.fn(() => <div data-test-subj="loadingCallout" />),
}));
jest.mock('../../../use_attack_discovery/helpers', () => ({
  getGenAiConfig: jest.fn(() => ({ defaultModel: 'gpt-4o' })),
}));

const MockLoadingCallout = LoadingCallout as jest.MockedFunction<typeof LoadingCallout>;

const defaultProps = {
  aiConnectors: getMockConnectors(),
  localStorageAttackDiscoveryMaxAlerts: undefined,
  refetchGenerations: jest.fn(),
};

describe('Generations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a callout for every NON-dismissed generation', () => {
    render(
      <TestProviders>
        <Generations {...defaultProps} data={{ generations: getMockGenerations().generations }} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('generations').length).toBe(1); // only 1/3 of the generations are non-dismissed
  });

  it(`renders at most 5 latest non-dismissed generations`, () => {
    const length = 8;
    const baseGen = getMockGenerations().generations[0];
    const manyGenerations = Array.from({ length }, (_, i) => ({
      ...baseGen,
      execution_uuid: `uuid-${i}`,
      status: 'succeeded' as const,
    }));

    render(
      <TestProviders>
        <Generations {...defaultProps} data={{ generations: manyGenerations }} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('generations').length).toBe(5);
  });

  it('does NOT render callouts when data is undefined', () => {
    render(
      <TestProviders>
        <Generations {...defaultProps} data={undefined} />
      </TestProviders>
    );

    expect(screen.queryByTestId('generations')).toBeNull();
  });

  it('does not render callouts when generations is empty', () => {
    render(
      <TestProviders>
        <Generations {...defaultProps} data={{ generations: [] }} />
      </TestProviders>
    );

    expect(screen.queryByTestId('generations')).toBeNull();
  });

  it('filters out dismissed generations', () => {
    render(
      <TestProviders>
        <Generations {...defaultProps} data={getMockGenerations()} />
      </TestProviders>
    );

    const nonDismissedGenerations = getMockGenerations().generations.filter(
      (x) => x.status !== 'dismissed'
    ).length;

    expect(screen.getAllByTestId('generations').length).toBe(nonDismissedGenerations);
  });

  describe('prop forwarding to LoadingCallout', () => {
    beforeEach(() => {
      MockLoadingCallout.mockClear();
    });

    it('passes connectorActionTypeId to LoadingCallout', () => {
      const generation = {
        ...getMockGenerations().generations[0],
        connector_id: 'gpt41Azure',
        status: 'failed' as const,
      };

      render(
        <TestProviders>
          <Generations {...defaultProps} data={{ generations: [generation] }} />
        </TestProviders>
      );

      expect(MockLoadingCallout).toHaveBeenCalledWith(
        expect.objectContaining({ connectorActionTypeId: '.gen-ai' }),
        expect.anything()
      );
    });

    it('passes connectorModel to LoadingCallout', () => {
      const generation = {
        ...getMockGenerations().generations[0],
        connector_id: 'gpt41Azure',
        status: 'failed' as const,
      };

      render(
        <TestProviders>
          <Generations {...defaultProps} data={{ generations: [generation] }} />
        </TestProviders>
      );

      expect(MockLoadingCallout).toHaveBeenCalledWith(
        expect.objectContaining({ connectorModel: 'gpt-4o' }),
        expect.anything()
      );
    });

    it('passes sourceMetadata to LoadingCallout', () => {
      const sourceMetadata = { rule_id: 'rule-abc', rule_name: 'My Schedule Rule' };
      const generation = {
        ...getMockGenerations().generations[0],
        source_metadata: sourceMetadata,
        status: 'failed' as const,
      };

      render(
        <TestProviders>
          <Generations {...defaultProps} data={{ generations: [generation] }} />
        </TestProviders>
      );

      expect(MockLoadingCallout).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMetadata }),
        expect.anything()
      );
    });
  });
});
