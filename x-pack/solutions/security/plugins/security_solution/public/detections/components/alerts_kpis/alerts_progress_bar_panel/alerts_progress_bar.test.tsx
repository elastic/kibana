/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsProgressBar } from './alerts_progress_bar';
import { parsedAlerts } from './mock_data';
import type { GroupBySelection } from './types';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by grouping', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
    groupBySelection: 'host.name' as GroupBySelection,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('progress bars renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsProgressBar {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('alerts-progress-bar-title').textContent).toEqual(
      defaultProps.groupBySelection
    );
    expect(getByTestId('empty-proress-bar')).toBeInTheDocument();
    expect(getByTestId('empty-proress-bar').textContent).toEqual('No items found');
  });

  test('progress bars renders correctly with data', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AlertsProgressBar data={parsedAlerts} isLoading={false} groupBySelection={'host.name'} />
      </TestProviders>
    );
    expect(getByTestId('alerts-progress-bar-title').textContent).toEqual('host.name');
    expect(getByTestId('progress-bar')).toBeInTheDocument();
    expect(queryByTestId('empty-proress-bar')).not.toBeInTheDocument();

    parsedAlerts.forEach((alert, i) => {
      if (alert.key !== '-') {
        expect(getByTestId(`progress-bar-${alert.key}`)).toBeInTheDocument();
        expect(getByTestId(`progress-bar-${alert.key}`).textContent).toContain(
          parsedAlerts[i].label
        );
        expect(getByTestId(`progress-bar-${alert.key}`).textContent).toContain(
          parsedAlerts[i].percentageLabel
        );
      }
      if (alert.key !== 'Other' && alert.key !== '-') {
        expect(getByTestId(`progress-bar-${alert.key}-actions`)).toBeInTheDocument();
      }
    });
  });
});
