/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('RecommendationsPlanPanel', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onOpenDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel title and the Escalate badge', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);
    expect(screen.getByText('Recommendations plan')).toBeInTheDocument();
    expect(screen.getByText('Escalate')).toBeInTheDocument();
  });

  it('renders the summary description with the step count', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);
    expect(screen.getByText(/We recommend a/)).toBeInTheDocument();
    expect(screen.getByText('2 step plan')).toBeInTheDocument();
    expect(
      screen.getByText(/to understand what the remediation of this might be/)
    ).toBeInTheDocument();
  });

  it('hides the steps by default and shows the "Open details" button', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);
    expect(screen.getByText('Open details')).toBeInTheDocument();
    expect(screen.queryByText('Monitoring order-flow signal volumes')).not.toBeInTheDocument();
  });

  it('reveals the steps and toggles the button label when "Open details" is clicked', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId('sigeventsOverviewRecommendationsPlanOpenDetails'));

    expect(screen.getByText('Close details')).toBeInTheDocument();
    expect(screen.getByText('Monitoring order-flow signal volumes')).toBeInTheDocument();
    expect(screen.getByText(/Continue monitoring order-flow signal volumes/)).toBeVisible();
    expect(screen.getByText('Checkout service verification')).toBeInTheDocument();
  });

  it('calls onOpenDetails with the next state when toggling', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);

    const button = screen.getByTestId('sigeventsOverviewRecommendationsPlanOpenDetails');
    fireEvent.click(button);
    expect(defaultProps.onOpenDetails).toHaveBeenLastCalledWith(true);

    fireEvent.click(button);
    expect(defaultProps.onOpenDetails).toHaveBeenLastCalledWith(false);
    expect(defaultProps.onOpenDetails).toHaveBeenCalledTimes(2);
  });

  it('hides the steps again when "Close details" is clicked', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);

    const button = screen.getByTestId('sigeventsOverviewRecommendationsPlanOpenDetails');
    fireEvent.click(button);
    expect(screen.getByText('Monitoring order-flow signal volumes')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText('Monitoring order-flow signal volumes')).not.toBeInTheDocument();
    expect(screen.getByText('Open details')).toBeInTheDocument();
  });

  it('starts with the details open when initialDetailsOpen is true', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} initialDetailsOpen />);

    expect(screen.getByText('Close details')).toBeInTheDocument();
    expect(screen.getByText('Monitoring order-flow signal volumes')).toBeInTheDocument();
  });

  it('toggles a single step open and closed when its accordion is clicked', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} initialDetailsOpen />);

    const description = screen.getByText(/Continue monitoring order-flow signal volumes/);
    expect(description).toBeVisible();

    fireEvent.click(screen.getByTestId('sigeventsOverviewRecommendationsPlanStepToggle-1'));
    expect(description).not.toBeVisible();

    fireEvent.click(screen.getByTestId('sigeventsOverviewRecommendationsPlanStepToggle-1'));
    expect(description).toBeVisible();
  });

  it('starts with all steps collapsed when initialOpenStepIds is empty', () => {
    renderWithIntl(
      <RecommendationsPlanPanel {...defaultProps} initialDetailsOpen initialOpenStepIds={[]} />
    );
    expect(screen.getByText(/Continue monitoring order-flow signal volumes/)).not.toBeVisible();
  });

  it('renders custom steps when details are open', () => {
    renderWithIntl(
      <RecommendationsPlanPanel
        {...defaultProps}
        initialDetailsOpen
        steps={[
          { id: 'a', title: 'Custom step A', description: 'Custom description A' },
          { id: 'b', title: 'Custom step B' },
        ]}
      />
    );
    expect(screen.getByText('Custom step A')).toBeInTheDocument();
    expect(screen.getByText('Custom description A')).toBeInTheDocument();
    expect(screen.getByText('Custom step B')).toBeInTheDocument();
  });

  it('calls onRemediate when the Remediate with Agent Builder button is clicked', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sigeventsOverviewRecommendationsPlanRemediate'));
    expect(defaultProps.onRemediate).toHaveBeenCalledTimes(1);
  });

  it('has the correct test subject', () => {
    renderWithIntl(<RecommendationsPlanPanel {...defaultProps} />);
    expect(screen.getByTestId('sigeventsOverviewRecommendationsPlanPanel')).toBeInTheDocument();
  });
});
