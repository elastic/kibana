/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RemediationPlanPanel } from './remediation_plan_panel';

describe('RemediationPlanPanel', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onRunInBackground: jest.fn(),
    onOpenConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default steps', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    expect(screen.getByText('Remediation plan')).toBeInTheDocument();
    expect(screen.getByText(/4 step remediation plan/)).toBeInTheDocument();
  });

  it('renders with custom steps', () => {
    const customSteps = [
      { id: '1', label: 'Custom step 1' },
      { id: '2', label: 'Custom step 2' },
    ];
    render(<RemediationPlanPanel {...defaultProps} steps={customSteps} />);
    expect(screen.getByText(/2 step remediation plan/)).toBeInTheDocument();
  });

  it('shows collapsed view by default', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    expect(screen.getByText('Show details')).toBeInTheDocument();
    expect(screen.getByText(/Start remediation with Elastic Agent Builder/)).toBeInTheDocument();
  });

  it('expands to show steps when "Show details" is clicked', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Show details'));
    expect(screen.getByText('Close details')).toBeInTheDocument();
    expect(screen.getByText('Restart Cloud Run service')).toBeInTheDocument();
    expect(screen.getByText('Review active critical alerts')).toBeInTheDocument();
  });

  it('collapses when "Close details" is clicked', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Show details'));
    fireEvent.click(screen.getByText('Close details'));
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('calls onRemediate when remediate button is clicked (collapsed)', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Remediate'));
    expect(defaultProps.onRemediate).toHaveBeenCalledTimes(1);
  });

  it('calls onRunInBackground when run in background button is clicked', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    const button = screen.getByTestId('sigeventsOverviewRemediationRunInBackground');
    fireEvent.click(button);
    expect(defaultProps.onRunInBackground).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenConversation when open conversation button is clicked (expanded)', () => {
    render(<RemediationPlanPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Show details'));
    const button = screen.getByTestId('sigeventsOverviewRemediationOpenConversation');
    fireEvent.click(button);
    expect(defaultProps.onOpenConversation).toHaveBeenCalledTimes(1);
  });

  it('has the correct test subject', () => {
    const { container } = render(<RemediationPlanPanel {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewRemediationPlanPanel"]')
    ).toBeInTheDocument();
  });
});
