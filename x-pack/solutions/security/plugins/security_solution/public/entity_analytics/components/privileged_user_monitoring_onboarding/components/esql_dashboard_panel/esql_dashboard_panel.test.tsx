/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EsqlDashboardPanel, DEFAULT_PAGE_SIZE } from './esql_dashboard_panel';
import { TestProviders } from '../../../../../common/mock';

jest.mock(
  '../../../../../common/components/visualization_actions/visualization_embeddable',
  () => ({
    VisualizationEmbeddable: jest.fn(() => (
      <div data-test-subj="mockVisualizationEmbeddable">{'Mock Visualization Embeddable'}</div>
    )),
  })
);

jest.mock('../../../../../common/hooks/use_error_toast', () => ({
  useErrorToast: jest.fn(),
}));

jest.mock('../../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: jest.fn(() => ({
      services: {
        ...actual.useKibana().services,
        data: {
          search: {
            search: jest.fn(),
          },
        },
      },
    })),
  };
});

const EMPTY_QUERY_RESPONSE = {
  response: {
    columns: [],
    values: [] as unknown,
  },
};

const mockUseQuery = jest.fn(() => ({
  isInitialLoading: false,
  isLoading: false,
  isError: false,
  isRefetching: false,
  data: EMPTY_QUERY_RESPONSE,
  error: null as unknown,
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => mockUseQuery(),
  };
});

describe('EsqlDashboardPanel', () => {
  const mockProps = {
    title: 'Test Dashboard',
    stackByOptions: [
      { text: 'Option 1', value: 'option1' },
      { text: 'Option 2', value: 'option2' },
    ],
    stackByField: 'option1',
    generateVisualizationQuery: jest.fn(),
    generateTableQuery: jest.fn(),
    getLensAttributes: jest.fn(),
    columns: [
      { field: 'field1', name: 'Field 1' },
      { field: 'field2', name: 'Field 2' },
    ],
    timerange: { from: 'now-15m', to: 'now' },
    pageSize: DEFAULT_PAGE_SIZE,
  };

  it('renders the component with default props', () => {
    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('genericDashboardSections')).toBeInTheDocument();
    expect(screen.getByText('Field 1')).toBeInTheDocument();
    expect(screen.getByText('Field 2')).toBeInTheDocument();
  });

  it('calls generateVisualizationQuery with the selected stackBy option', () => {
    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(mockProps.generateVisualizationQuery).toHaveBeenCalledWith('option1');
  });

  it('renders the table with the provided columns', () => {
    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(screen.getByText('Field 1')).toBeInTheDocument();
    expect(screen.getByText('Field 2')).toBeInTheDocument();
  });

  it('renders a loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({
      isInitialLoading: true,
      isLoading: true,
      isError: false,
      isRefetching: false,
      data: EMPTY_QUERY_RESPONSE,
      error: null,
    });

    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error callout when there is an error', () => {
    mockUseQuery.mockReturnValue({
      isInitialLoading: false,
      isLoading: false,
      isError: true,
      isRefetching: false,
      data: EMPTY_QUERY_RESPONSE,
      error: new Error('Test error'),
    });

    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  it('renders the "Show more" button when there are more items to load', () => {
    const values = Array(DEFAULT_PAGE_SIZE + 1).fill([]);

    mockUseQuery.mockReturnValue({
      isInitialLoading: true,
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: {
        response: {
          columns: [],
          values,
        },
      },
      error: null,
    });

    render(<EsqlDashboardPanel {...mockProps} />, { wrapper: TestProviders });

    expect(screen.getByText('Show more')).toBeInTheDocument();
  });
});
