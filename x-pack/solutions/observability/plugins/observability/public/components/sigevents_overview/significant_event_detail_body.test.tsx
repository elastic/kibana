/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SignificantEventDetailBody } from './significant_event_detail_body';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Metric: () => <div data-test-subj="mock-metric" />,
  LayoutDirection: { Vertical: 'vertical' },
  LIGHT_THEME: {},
}));

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
    onRunInBackground: jest.fn(),
    onOpenConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event severity', () => {
    render(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
  });

  it('renders relevance score', () => {
    render(<SignificantEventDetailBody {...defaultProps} relevanceScore={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders suggestions count', () => {
    render(<SignificantEventDetailBody {...defaultProps} suggestionsCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders summary panel', () => {
    render(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders general information panel', () => {
    render(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('General information')).toBeInTheDocument();
  });

  it('renders stream information', () => {
    render(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('logs · fleet-coordination')).toBeInTheDocument();
  });

  it('renders remediation plan panel', () => {
    render(<SignificantEventDetailBody {...defaultProps} />);
    expect(screen.getByText('Remediation plan')).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = render(<SignificantEventDetailBody {...defaultProps} />);
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
    render(<SignificantEventDetailBody {...defaultProps} event={warningEvent} />);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });

  it('renders with subdued severity color for unknown severity', () => {
    const unknownSeverityEvent = {
      ...mockEvent,
      severityLabel: 'Low',
      severityColor: 'hollow' as const,
    };
    render(<SignificantEventDetailBody {...defaultProps} event={unknownSeverityEvent} />);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });
});
