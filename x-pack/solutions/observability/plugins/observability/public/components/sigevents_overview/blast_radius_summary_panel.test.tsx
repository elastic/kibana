/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BlastRadiusSummaryPanel } from './blast_radius_summary_panel';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Metric: () => <div data-test-subj="mock-metric" />,
  LayoutDirection: { Vertical: 'vertical' },
  LIGHT_THEME: {},
}));

describe('BlastRadiusSummaryPanel', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onRunInBackground: jest.fn(),
    onAttachEntity: jest.fn(),
    onAttachEvent: jest.fn(),
    onOpenConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default values', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    expect(screen.getByText('Blast radius score')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('renders blast radius donut with score', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} blastRadiusScore={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders entity list', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    expect(screen.getByText('Critically affected entities')).toBeInTheDocument();
    expect(screen.getByText('High risk entities')).toBeInTheDocument();
    expect(screen.getByText('Active significant events')).toBeInTheDocument();
  });

  it('renders with custom entities', () => {
    const customEntities = [
      {
        id: 'custom1',
        title: 'Custom entity',
        iconType: 'alert' as const,
        iconColor: 'warning' as const,
        badgeLabel: '5/10',
        badgeColor: 'warning' as const,
      },
    ];
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} entities={customEntities} />);
    expect(screen.getByText('Custom entity')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('calls onRemediate when remediate button is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Remediate'));
    expect(defaultProps.onRemediate).toHaveBeenCalledTimes(1);
  });

  it('calls onRunInBackground when run in background button is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Run in background'));
    expect(defaultProps.onRunInBackground).toHaveBeenCalledTimes(1);
  });

  it('calls onAttachEntity when attach button is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    const attachButtons = screen.getAllByRole('button', { name: /attach context/i });
    fireEvent.click(attachButtons[0]);
    expect(defaultProps.onAttachEntity).toHaveBeenCalled();
  });

  it('opens entity flyout when maximize button is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    const expandButtons = screen.getAllByRole('button', { name: /open details/i });
    fireEvent.click(expandButtons[0]);
    expect(screen.getByTestId('sigeventsOverviewBlastRadiusEntityFlyout')).toBeInTheDocument();
  });

  it('opens significant events flyout when sig events entity is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    const expandButtons = screen.getAllByRole('button', { name: /open details/i });
    fireEvent.click(expandButtons[2]);
    expect(screen.getByTestId('sigeventsOverviewSignificantEventsFlyout')).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewBlastRadiusPanel"]')
    ).toBeInTheDocument();
  });

  it('closes entity flyout when close button is clicked', () => {
    renderWithIntl(<BlastRadiusSummaryPanel {...defaultProps} />);
    const expandButtons = screen.getAllByRole('button', { name: /open details/i });
    fireEvent.click(expandButtons[0]);
    expect(screen.getByTestId('sigeventsOverviewBlastRadiusEntityFlyout')).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(
      screen.queryByTestId('sigeventsOverviewBlastRadiusEntityFlyout')
    ).not.toBeInTheDocument();
  });
});
