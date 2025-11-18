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

const mockFutureTime = '2025-05-19T23:20:15.933Z';

jest.mock('./get_approximate_future_time', () => ({
  getApproximateFutureTime: jest.fn(() => new Date(mockFutureTime)),
}));
jest.mock('../../../utils/get_connector_name_from_id', () => ({
  getConnectorNameFromId: jest.fn(() => 'Mock Connector Name'),
}));

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
});
