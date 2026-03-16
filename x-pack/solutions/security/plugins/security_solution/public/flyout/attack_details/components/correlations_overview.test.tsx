/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CorrelationsOverview } from './correlations_overview';
import { INSIGHTS_CORRELATIONS_TEST_ID } from '../constants/test_ids';
import { useOriginalAlertIds } from '../hooks/use_original_alert_ids';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('../hooks/use_original_alert_ids', () => ({
  useOriginalAlertIds: jest.fn(),
}));

const renderWithEui = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('CorrelationsOverview', () => {
  beforeEach(() => {
    jest.mocked(useOriginalAlertIds).mockReturnValue(['alert-1', 'alert-2']);
  });

  it('renders the section with the correlations test id', () => {
    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByTestId(INSIGHTS_CORRELATIONS_TEST_ID)).toBeInTheDocument();
  });

  it('renders the Related alerts label', () => {
    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByText('Related alerts')).toBeInTheDocument();
  });

  it('renders the related alerts count in a badge', () => {
    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders count of zero when there are no original alert IDs', () => {
    jest.mocked(useOriginalAlertIds).mockReturnValue([]);

    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders count matching the number of original alert IDs', () => {
    jest.mocked(useOriginalAlertIds).mockReturnValue(['id-1', 'id-2', 'id-3']);

    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders title as text only (no link)', () => {
    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleText`)).toBeInTheDocument();
    expect(
      screen.queryByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`)
    ).not.toBeInTheDocument();
  });
});
