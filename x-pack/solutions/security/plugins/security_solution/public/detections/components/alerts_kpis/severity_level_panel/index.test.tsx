/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { SeverityLevelPanel } from '.';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';

vi.mock('../../../../common/lib/kibana');
vi.mock('../alerts_summary_charts_panel/use_summary_chart_data');

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return { ...actual, useLocation: vi.fn().mockReturnValue({ pathname: '' }) };
});

describe('Severity level panel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    skip: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSummaryChartData as Mock).mockReturnValue({
      items: [],
      isLoading: false,
    });
  });

  test('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('severty-level-panel')).toBeInTheDocument();
  });

  test('render HeaderSection', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('header-section')).toBeInTheDocument();
  });

  test('inspect button renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('inspect-icon-button')).toBeInTheDocument();
  });

  test('renders severity chart correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityLevelPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('severity-level-chart')).toBeInTheDocument();
  });
});
