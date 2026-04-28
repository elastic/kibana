/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MainSignificantEvent } from './main_significant_event';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('MainSignificantEvent', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onViewDetails: jest.fn(),
    onOpenMoreActions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the card with the default severity badge, title and description', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);

    expect(screen.getByTestId('sigeventsOverviewMainSignificantEvent')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dropped payments on oteldemo.com and video streams on otelfix.com due to unavailable Auth Service'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start remediation now with Elastic Agent Builder or review details to get more context about the impact.'
      )
    ).toBeInTheDocument();
  });

  it('renders the criticality donut with the provided score', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} blastRadiusScore={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the Remediate in Chat AI button', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);
    expect(screen.getByText('Remediate in Chat')).toBeInTheDocument();
  });

  it('renders the default impacted services', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);
    expect(screen.getByText('Impacted services:')).toBeInTheDocument();
    expect(screen.getByText('payment')).toBeInTheDocument();
    expect(screen.getByText('checkout')).toBeInTheDocument();
  });

  it('renders custom impacted services', () => {
    renderWithIntl(
      <MainSignificantEvent
        {...defaultProps}
        impactedServices={[
          { id: 'svc-a', label: 'service-a' },
          { id: 'svc-b', label: 'service-b' },
        ]}
      />
    );
    expect(screen.getByText('service-a')).toBeInTheDocument();
    expect(screen.getByText('service-b')).toBeInTheDocument();
  });

  it('calls onRemediate when the remediate button is clicked', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sigeventsOverviewMainSignificantEventRemediateButton'));
    expect(defaultProps.onRemediate).toHaveBeenCalledTimes(1);
  });

  it('calls onViewDetails when the view details button is clicked', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sigeventsOverviewMainSignificantEventViewDetailsButton'));
    expect(defaultProps.onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenMoreActions when the more actions button is clicked', () => {
    renderWithIntl(<MainSignificantEvent {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sigeventsOverviewMainSignificantEventMoreActions'));
    expect(defaultProps.onOpenMoreActions).toHaveBeenCalledTimes(1);
  });
});
