/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RiskLevelsPrivilegedUsersPanel } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useRiskLevelsPrivilegedUserQuery } from './hooks';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';

jest.mock('./hooks', () => {
  const actual = jest.requireActual('./hooks');
  return {
    ...actual,
    useRiskLevelsPrivilegedUserQuery: jest.fn(),
  };
});

jest.mock('../../../../../common/containers/query_toggle', () => ({
  useQueryToggle: jest.fn(),
}));

describe('RiskLevelsPrivilegedUsersPanel', () => {
  const mockUseRiskLevelsPrivilegedUserQuery = useRiskLevelsPrivilegedUserQuery as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: jest.fn(),
    });
    mockUseRiskLevelsPrivilegedUserQuery.mockReturnValue({
      hasEngineBeenInstalled: true,
      records: [],
      isLoading: false,
      refetch: jest.fn(),
      inspect: null,
      isError: false,
    });
  });

  it('renders the panel with the correct title', () => {
    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    expect(screen.getByText('Risk levels of privileged users')).toBeInTheDocument();
  });

  it('renders the error callout when there is an error', () => {
    mockUseRiskLevelsPrivilegedUserQuery.mockReturnValue({
      hasEngineBeenInstalled: true,
      records: [],
      isLoading: false,
      refetch: jest.fn(),
      inspect: null,
      isError: true,
    });

    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  it('renders the donut chart when data is available', () => {
    mockUseRiskLevelsPrivilegedUserQuery.mockReturnValue({
      hasEngineBeenInstalled: true,
      records: [
        { level: 'Critical', count: 5 },
        { level: 'High', count: 10 },
      ],
      isLoading: false,
      refetch: jest.fn(),
      inspect: null,
      isError: false,
    });

    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    expect(screen.getByTestId('donut-chart')).toBeInTheDocument();
  });

  it('renders the table with correct rows when data is available', () => {
    mockUseRiskLevelsPrivilegedUserQuery.mockReturnValue({
      hasEngineBeenInstalled: true,
      records: [
        { level: 'Critical', count: 5 },
        { level: 'High', count: 10 },
      ],
      isLoading: false,
      refetch: jest.fn(),
      inspect: null,
      isError: false,
    });

    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    const table = screen.getByTestId('severity-level-table');
    expect(table).toBeInTheDocument();

    const rowsTextContent = screen.getAllByRole('row').map((row) => row.textContent);

    expect(rowsTextContent).toContain('Critical533%');
    expect(rowsTextContent).toContain('High1067%');
  });

  it('does not render content when toggleStatus is false', () => {
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: false,
      setToggleStatus: jest.fn(),
    });

    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    expect(screen.queryByTestId('severity-level-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('donut-chart')).not.toBeInTheDocument();
  });

  it('renders the risk score enablement when hasEngineBeenInstalled is false', () => {
    mockUseRiskLevelsPrivilegedUserQuery.mockReturnValue({
      hasEngineBeenInstalled: false,
      records: [],
      isLoading: false,
      refetch: jest.fn(),
      inspect: null,
      isError: false,
    });

    render(<RiskLevelsPrivilegedUsersPanel spaceId={'default'} />, { wrapper: TestProviders });

    expect(screen.getByTestId('enable_risk_score')).toBeInTheDocument();
  });
});
