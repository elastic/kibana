/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsByRulePanel } from '.';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';

jest.mock('../../../../common/lib/kibana');
jest.mock('../alerts_summary_charts_panel/use_summary_chart_data');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by rule panel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    skip: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSummaryChartData as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
    });
  });

  test('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('alerts-by-rule-panel')).toBeInTheDocument();
  });

  test('renders HeaderSection', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('header-section')).toBeInTheDocument();
  });

  test('renders inspect button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('inspect-icon-button')).toBeInTheDocument();
  });

  test('renders alert by rule chart', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('alerts-by-rule')).toBeInTheDocument();
  });
});
