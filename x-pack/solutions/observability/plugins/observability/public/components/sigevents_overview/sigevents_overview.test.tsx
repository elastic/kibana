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

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
};

describe('SigeventsOverview', () => {
  const defaultProps = {
    onRemediate: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when state is critical', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverview')).toBeInTheDocument();
  });

  it('renders with default state (critical)', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} />);
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

  it('renders the StatusHeader', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewStatusHeader')).toBeInTheDocument();
  });

  it('renders the MainSignificantEvent card', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewMainSignificantEvent')).toBeInTheDocument();
  });

  it('passes blast radius score to the MainSignificantEvent', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" blastRadiusScore={95} />);
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('passes a custom main event title', () => {
    renderWithIntl(
      <SigeventsOverview
        {...defaultProps}
        state="critical"
        mainEventTitle="Custom event title"
      />
    );
    expect(screen.getByText('Custom event title')).toBeInTheDocument();
  });

  it('renders the default impacted cards between the header and the main event', () => {
    renderWithIntl(<SigeventsOverview {...defaultProps} state="critical" />);
    expect(screen.getByTestId('sigeventsOverviewImpactedCards')).toBeInTheDocument();
    expect(screen.getByText('Impacted')).toBeInTheDocument();
    expect(screen.getAllByTestId('sigeventsOverviewImpactedCard')).toHaveLength(2);
  });

  it('renders custom impacted cards', () => {
    renderWithIntl(
      <SigeventsOverview
        {...defaultProps}
        state="critical"
        impactedCards={[
          { id: 'a', label: 'Service', value: 'service-a' },
          { id: 'b', label: 'Service', value: 'service-b' },
          { id: 'c', label: 'Dropped events', value: '1,234' },
        ]}
      />
    );
    expect(screen.getAllByTestId('sigeventsOverviewImpactedCard')).toHaveLength(3);
    expect(screen.getByText('service-a')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('does not render the impacted cards section when empty', () => {
    renderWithIntl(
      <SigeventsOverview {...defaultProps} state="critical" impactedCards={[]} />
    );
    expect(screen.queryByTestId('sigeventsOverviewImpactedCards')).not.toBeInTheDocument();
  });
});
