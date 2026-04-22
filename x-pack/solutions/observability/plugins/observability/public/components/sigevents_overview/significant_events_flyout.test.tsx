/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignificantEventsFlyout } from './significant_events_flyout';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Metric: () => <div data-test-subj="mock-metric" />,
  LayoutDirection: { Vertical: 'vertical' },
  LIGHT_THEME: {},
}));

describe('SignificantEventsFlyout', () => {
  const mockEvents = [
    {
      id: '1',
      label: 'Fleet Server Dependency Chain',
      subtitle: 'logs · fleet-coordination',
      severityLabel: 'Critical',
      severityColor: 'danger' as const,
    },
    {
      id: '2',
      label: 'Central Authentication Server',
      subtitle: 'metrics · identity',
      severityLabel: 'High',
      severityColor: 'warning' as const,
    },
  ];

  const defaultProps = {
    onClose: jest.fn(),
    events: mockEvents,
    onAttachEvent: jest.fn(),
    onRemediate: jest.fn(),
    onRunInBackground: jest.fn(),
    onOpenConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    expect(screen.getByText('Active significant events')).toBeInTheDocument();
  });

  it('renders all events in the list', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    expect(screen.getByText('Fleet Server Dependency Chain')).toBeInTheDocument();
    expect(screen.getByText('Central Authentication Server')).toBeInTheDocument();
  });

  it('renders event count in heading', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    expect(screen.getByText('Significant events (2)')).toBeInTheDocument();
  });

  it('renders metadata cards', () => {
    render(
      <SignificantEventsFlyout
        {...defaultProps}
        healthyEntities={24}
        affectedSystems={20}
        atRiskCount={4}
      />
    );
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAttachEvent when attach button is clicked', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    const attachButtons = screen.getAllByRole('button', { name: /attach context/i });
    fireEvent.click(attachButtons[0]);
    expect(defaultProps.onAttachEvent).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('opens child flyout when expand button is clicked', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    const expandButton = screen.getByTestId('sigeventsOverviewSigEventExpand-1');
    fireEvent.click(expandButton);
    expect(screen.getByTestId('sigeventsOverviewSignificantEventChildFlyout')).toBeInTheDocument();
  });

  it('closes child flyout when collapse button is clicked', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    const expandButton = screen.getByTestId('sigeventsOverviewSigEventExpand-1');
    fireEvent.click(expandButton);
    expect(screen.getByTestId('sigeventsOverviewSignificantEventChildFlyout')).toBeInTheDocument();
    fireEvent.click(expandButton);
    expect(
      screen.queryByTestId('sigeventsOverviewSignificantEventChildFlyout')
    ).not.toBeInTheDocument();
  });

  it('closes child flyout via its close button', () => {
    render(<SignificantEventsFlyout {...defaultProps} />);
    const expandButton = screen.getByTestId('sigeventsOverviewSigEventExpand-1');
    fireEvent.click(expandButton);
    expect(screen.getByTestId('sigeventsOverviewSignificantEventChildFlyout')).toBeInTheDocument();
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    const childFlyoutCloseButton = closeButtons[closeButtons.length - 1];
    fireEvent.click(childFlyoutCloseButton);
    expect(
      screen.queryByTestId('sigeventsOverviewSignificantEventChildFlyout')
    ).not.toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = render(<SignificantEventsFlyout {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewSignificantEventsFlyout"]')
    ).toBeInTheDocument();
  });
});
