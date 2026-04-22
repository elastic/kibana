/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SigeventsOverview } from './sigevents_overview';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Metric: () => <div data-test-subj="mock-metric" />,
  LayoutDirection: { Vertical: 'vertical' },
  LIGHT_THEME: {},
}));

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
};

describe('SigeventsOverview', () => {
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

  it('renders when state is critical', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
  });

  it('renders with default state (critical)', () => {
    const { onRemediate, onRunInBackground, onAttachEntity, onAttachEvent, onOpenConversation } =
      defaultProps;
    renderWithIntl(
      <SigeventsOverview
        onRemediate={onRemediate}
        onRunInBackground={onRunInBackground}
        onAttachEntity={onAttachEntity}
        onAttachEvent={onAttachEvent}
        onOpenConversation={onOpenConversation}
      />
    );
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
  });

  it('does not render when state is healthy', () => {
    const { container } = renderWithIntl(<SigeventsOverview {...defaultProps} state="healthy" />);
    expect(container.querySelector('[data-test-subj="sigeventsOverview"]')).not.toBeInTheDocument();
  });

  it('does not render when state is warning', () => {
    const { container } = renderWithIntl(<SigeventsOverview {...defaultProps} state="warning" />);
    expect(container.querySelector('[data-test-subj="sigeventsOverview"]')).not.toBeInTheDocument();
  });

  it('renders mode badge', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByText('SIGNIFICANT EVENTS')).toBeInTheDocument();
  });

  it('renders main heading', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByText('Your system requires attention')).toBeInTheDocument();
  });

  it('renders intro description', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(
      screen.getByText(/Our system is detecting more unusual behaviour than normal/)
    ).toBeInTheDocument();
  });

  it('renders blast radius summary panel', () => {
    const { container } = renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewBlastRadiusPanel"]')
    ).toBeInTheDocument();
  });

  it('passes blast radius score to summary panel', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" blastRadiusScore={95} />);
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('passes counts to summary panel', () => {
    renderWithIntl(
      <SigeventsOverview
        {...defaultProps}
        state="critical"
        criticalCount={10}
        highCount={15}
        significantEventsCount={30}
      />
    );
    expect(screen.getByText(/10 Critical/)).toBeInTheDocument();
    expect(screen.getByText(/15 High/)).toBeInTheDocument();
    expect(screen.getByText(/30 Significant events/)).toBeInTheDocument();
  });
});
