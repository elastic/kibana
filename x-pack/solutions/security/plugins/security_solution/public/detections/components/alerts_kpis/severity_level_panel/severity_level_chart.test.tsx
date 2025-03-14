/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { SeverityLevelChart } from './severity_level_chart';
import { parsedAlerts } from './mock_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Severity level chart', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders severity table correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelChart {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('severity-level-table')).toBeInTheDocument();
    expect(getByTestId('severity-level-table')).toHaveTextContent('No items found');
  });

  test('renders severity donut correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelChart {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('severity-level-donut')).toBeInTheDocument();
  });

  test('renders table correctly with data', () => {
    const { queryAllByRole, getByTestId } = render(
      <TestProviders>
        <SeverityLevelChart data={parsedAlerts} isLoading={false} />
      </TestProviders>
    );
    expect(getByTestId('severity-level-table')).toBeInTheDocument();
    parsedAlerts.forEach((_, i) => {
      expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].label);
      expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].value.toString());
      expect(queryAllByRole('row')[i + 1].children).toHaveLength(3);
    });
  });
});
