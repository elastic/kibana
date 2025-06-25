/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TestProviders } from '../../../../../../common/mock';
import { KeyInsightsTile } from './key_insights_tile';

// Mock the hooks
jest.mock('../../../../../../common/hooks/esql/use_esql_global_filter');
jest.mock('../../../../../../common/containers/use_global_time');
jest.mock('../../../../../../common/hooks/use_space_id');

// Mock the VisualizationEmbeddable component
jest.mock(
  '../../../../../../common/components/visualization_actions/visualization_embeddable',
  () => ({
    VisualizationEmbeddable: ({ onError }: { onError?: () => void }) => {
      // Simulate error handling for testing
      if (onError && window.location.search.includes('simulateError=true')) {
        setTimeout(onError, 0);
      }
      return <div data-test-subj="visualization-embeddable">{'Mocked Visualization'}</div>;
    },
  })
);

const mockUseEsqlGlobalFilterQuery = jest.requireMock(
  '../../../../../../common/hooks/esql/use_esql_global_filter'
).useEsqlGlobalFilterQuery;
const mockUseGlobalTime = jest.requireMock(
  '../../../../../../common/containers/use_global_time'
).useGlobalTime;
const mockUseSpaceId = jest.requireMock('../../../../../../common/hooks/use_space_id').useSpaceId;

describe('KeyInsightsTile', () => {
  const defaultProps = {
    title: <FormattedMessage id="test.title" defaultMessage="Test Title" />,
    label: <FormattedMessage id="test.label" defaultMessage="Test Label" />,
    getEsqlQuery: jest.fn(
      (namespace: string) => `FROM logs-* | WHERE namespace == "${namespace}" | STATS COUNT(*)`
    ),
    id: 'test-tile',
    inspectTitle: <FormattedMessage id="test.inspect" defaultMessage="Test Inspect Title" />,
    spaceId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEsqlGlobalFilterQuery.mockReturnValue({ bool: { must: [] } });
    mockUseGlobalTime.mockReturnValue({ from: 'now-1d', to: 'now' });
    mockUseSpaceId.mockReturnValue('default');
  });

  it('renders visualization when data is available', () => {
    render(
      <TestProviders>
        <KeyInsightsTile {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('key-insights-tile-test-tile')).toBeInTheDocument();
    expect(screen.getByTestId('visualization-embeddable')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('renders N/A state when showNAState is true', () => {
    render(
      <TestProviders>
        <KeyInsightsTile {...defaultProps} showNAState={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('key-insights-tile-na-test-tile')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Data not available')).toBeInTheDocument();
    expect(screen.queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('renders N/A state when query is empty', () => {
    const propsWithEmptyQuery = {
      ...defaultProps,
      getEsqlQuery: jest.fn(() => ''),
    };

    render(
      <TestProviders>
        <KeyInsightsTile {...propsWithEmptyQuery} />
      </TestProviders>
    );

    expect(screen.getByTestId('key-insights-tile-na-test-tile')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('renders N/A state when query contains ERROR', () => {
    const propsWithErrorQuery = {
      ...defaultProps,
      getEsqlQuery: jest.fn(() => 'FROM logs-* | ERROR invalid syntax'),
    };

    render(
      <TestProviders>
        <KeyInsightsTile {...propsWithErrorQuery} />
      </TestProviders>
    );

    expect(screen.getByTestId('key-insights-tile-na-test-tile')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('renders N/A state when query function throws error', () => {
    const propsWithThrowingQuery = {
      ...defaultProps,
      getEsqlQuery: jest.fn(() => {
        throw new Error('Query generation failed');
      }),
    };

    render(
      <TestProviders>
        <KeyInsightsTile {...propsWithThrowingQuery} />
      </TestProviders>
    );

    expect(screen.getByTestId('key-insights-tile-na-test-tile')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('uses provided spaceId over hook spaceId', () => {
    const getEsqlQuerySpy = jest.fn(() => 'FROM logs-* | STATS COUNT(*)');

    render(
      <TestProviders>
        <KeyInsightsTile {...defaultProps} spaceId="custom-space" getEsqlQuery={getEsqlQuerySpy} />
      </TestProviders>
    );

    expect(getEsqlQuerySpy).toHaveBeenCalledWith('custom-space');
  });

  it('falls back to hook spaceId when no spaceId provided', () => {
    mockUseSpaceId.mockReturnValue('hook-space');
    const getEsqlQuerySpy = jest.fn(() => 'FROM logs-* | STATS COUNT(*)');
    const propsWithoutSpaceId = {
      ...defaultProps,
      spaceId: undefined,
      getEsqlQuery: getEsqlQuerySpy,
    };

    render(
      <TestProviders>
        <KeyInsightsTile {...propsWithoutSpaceId} />
      </TestProviders>
    );

    expect(getEsqlQuerySpy).toHaveBeenCalledWith('hook-space');
  });

  it('falls back to default spaceId when both hook and prop are undefined', () => {
    mockUseSpaceId.mockReturnValue(undefined);
    const getEsqlQuerySpy = jest.fn(() => 'FROM logs-* | STATS COUNT(*)');
    const propsWithoutSpaceId = {
      ...defaultProps,
      spaceId: undefined,
      getEsqlQuery: getEsqlQuerySpy,
    };

    render(
      <TestProviders>
        <KeyInsightsTile {...propsWithoutSpaceId} />
      </TestProviders>
    );

    expect(getEsqlQuerySpy).toHaveBeenCalledWith('default');
  });

  it('applies correct styling to N/A state', () => {
    render(
      <TestProviders>
        <KeyInsightsTile {...defaultProps} showNAState={true} />
      </TestProviders>
    );

    const naContainer = screen.getByTestId('key-insights-tile-na-test-tile');
    expect(naContainer).toHaveStyle({
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'align-items': 'center',
      'text-align': 'center',
    });
  });
});
