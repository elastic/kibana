/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SignificantEventDetailBody } from './significant_event_detail_body';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('SignificantEventDetailBody', () => {
  const mockEvent = {
    id: '1',
    label: 'Fleet Server Dependency Chain',
    subtitle: 'logs · fleet-coordination',
    severityLabel: 'Critical',
    severityColor: 'danger' as const,
  };

  const defaultProps = {
    event: mockEvent,
    onRemediate: jest.fn(),
    onOpenDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the event title as the header', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fleet Server Dependency Chain' })
    ).toBeInTheDocument();
  });

  it('renders the default detected-at timestamp below the header', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Detected 5 minutes ago')).toBeInTheDocument();
  });

  it('renders a custom detected-at label', () => {
    renderWithIntl(
      <SignificantEventDetailBody {...defaultProps} detectedAtLabel="Detected 12:30 UTC" />
    );
    expect(screen.getByText('Detected 12:30 UTC')).toBeInTheDocument();
  });

  it('does not render the header when hideHeader is true', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} hideHeader />);
    expect(
      screen.queryByTestId('sigeventsOverviewSignificantEventDetailHeader')
    ).not.toBeInTheDocument();
  });

  it('renders all four metadata cards with the expected titles', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getAllByText('Severity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Criticality').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Impact').length).toBeGreaterThan(0);
    expect(screen.getByText('Recommended action')).toBeInTheDocument();
  });

  it('renders the default values inside the metadata cards', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    // Severity badge value (from event.severityLabel)
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    // Criticality + Impact default to "High"
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(2);
    // Recommended action default to "Escalate"
    expect(screen.getAllByText('Escalate').length).toBeGreaterThan(0);
  });

  it('renders summary panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders the general information panel collapsed by default', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('General information')).toBeInTheDocument();
    // "Confidence" and "Impacting" only live inside the general info panel
    expect(screen.queryByText('Confidence')).not.toBeInTheDocument();
    expect(screen.queryByText('Impacting')).not.toBeInTheDocument();
    expect(screen.queryByText('logs · fleet-coordination')).not.toBeInTheDocument();
  });

  it('expands the general information panel when its toggle is clicked', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);

    fireEvent.click(screen.getByTestId('sigeventsOverviewInfoPanelToggle'));

    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Impacting')).toBeInTheDocument();
    expect(screen.getByText('logs · fleet-coordination')).toBeInTheDocument();
  });

  it('renders the recommendations plan panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Recommendations plan')).toBeInTheDocument();
  });

  it('renders the root cause panel', () => {
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByTestId('sigeventsOverviewRootCausePanel')).toBeInTheDocument();
    expect(screen.getByText('Root cause')).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = renderWithIntl(<SignificantEventDetailBody {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewSignificantEventDetailBody"]')
    ).toBeInTheDocument();
  });

  it('renders with warning severity color', () => {
    const warningEvent = {
      ...mockEvent,
      severityLabel: 'High',
      severityColor: 'warning' as const,
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={warningEvent} />);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });

  it('renders with subdued severity color for unknown severity', () => {
    const unknownSeverityEvent = {
      ...mockEvent,
      severityLabel: 'Low',
      severityColor: 'hollow' as const,
    };
    renderWithIntl(<SignificantEventDetailBody {...defaultProps} event={unknownSeverityEvent} />);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });
});
