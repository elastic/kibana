/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { CorrelationsOverview } from './correlations_overview';
import { INSIGHTS_CORRELATIONS_TEST_ID } from '../constants/test_ids';
import { useOriginalAlertIds } from '../hooks/use_original_alert_ids';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('../hooks/use_original_alert_ids', () => ({
  useOriginalAlertIds: jest.fn(),
}));

const mockNavigateToLeftPanel = jest.fn();
jest.mock('../hooks/use_navigate_to_attack_details_left_panel', () => ({
  useNavigateToAttackDetailsLeftPanel: jest.fn(() => mockNavigateToLeftPanel),
}));

const renderWithEui = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('CorrelationsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders title as a link that opens the left panel Correlation tab', () => {
    renderWithEui(<CorrelationsOverview />);

    expect(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`)).toBeInTheDocument();
    expect(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}LinkIcon`)).toBeInTheDocument();
    expect(
      screen.queryByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleText`)
    ).not.toBeInTheDocument();
  });

  it('calls navigate to left panel with correlation subTab when title link is clicked', async () => {
    const user = userEvent.setup();
    renderWithEui(<CorrelationsOverview />);

    await user.click(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`));

    expect(useNavigateToAttackDetailsLeftPanel).toHaveBeenCalledWith({ subTab: 'correlation' });
    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });
});
