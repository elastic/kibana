/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useHeaderData } from '../hooks/use_header_data';
import { HEADER_ALERTS_BLOCK_TEST_ID, HEADER_BADGE_TEST_ID } from '../constants/test_ids';

jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: jest.fn(),
}));

jest.mock('../../shared/components/flyout_title', () => ({
  FlyoutTitle: ({ title }: { title: string }) => <div data-test-subj="flyout-title">{title}</div>,
}));

jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => (
    <div data-test-subj="formatted-date">{value.toISOString()}</div>
  ),
}));

jest.mock('./status', () => ({
  Status: () => <div data-test-subj="status" />,
}));

jest.mock('../../shared/components/alert_header_block', () => ({
  AlertHeaderBlock: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
}));

const mockedUseHeaderData = useHeaderData as jest.Mock;

describe('HeaderTitle', () => {
  beforeEach(() => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Suspicious PowerShell Activity',
      timestamp: '2024-10-10T10:00:00.000Z',
      alertsCount: 3,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the attack badge', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_BADGE_TEST_ID)).toHaveTextContent('Attack');
  });

  it('renders the formatted timestamp when present', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('formatted-date')).toBeInTheDocument();
  });

  it('renders the header title', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('flyout-title')).toHaveTextContent('Suspicious PowerShell Activity');
  });

  it('renders the alerts count', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_ALERTS_BLOCK_TEST_ID)).toHaveTextContent('3');
  });

  it('does not render the timestamp when it is missing', () => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Attack title',
      timestamp: undefined,
      alertsCount: 0,
    });

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.queryByTestId('formatted-date')).not.toBeInTheDocument();
  });
});
