/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SignificantEventDetailHeader } from './significant_event_detail_header';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const baseProps = {
  title: 'Fleet Server Dependency Chain',
  severityLabel: 'Critical',
  severityColor: 'danger' as const,
};

describe('SignificantEventDetailHeader', () => {
  it('renders the title as an h2 and the default detected-at label', () => {
    renderWithIntl(<SignificantEventDetailHeader {...baseProps} />);

    expect(screen.getByTestId('sigeventsOverviewSignificantEventDetailHeader')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fleet Server Dependency Chain' })
    ).toBeInTheDocument();
    expect(screen.getByText('Detected 5 minutes ago')).toBeInTheDocument();
  });

  it('renders a custom detected-at label', () => {
    renderWithIntl(
      <SignificantEventDetailHeader {...baseProps} detectedAtLabel="Detected Jan 18 @ 14:12" />
    );
    expect(screen.getByText('Detected Jan 18 @ 14:12')).toBeInTheDocument();
  });

  it('renders the four metadata cards by default', () => {
    renderWithIntl(<SignificantEventDetailHeader {...baseProps} />);

    expect(
      screen.getByTestId('sigeventsOverviewSignificantEventDetailHeaderMetadata')
    ).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Criticality')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Recommended action')).toBeInTheDocument();

    // default values
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Escalate')).toBeInTheDocument();
  });

  it('hides the metadata cards when hideMetadataCards is true', () => {
    renderWithIntl(<SignificantEventDetailHeader {...baseProps} hideMetadataCards />);
    expect(
      screen.queryByTestId('sigeventsOverviewSignificantEventDetailHeaderMetadata')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended action')).not.toBeInTheDocument();
  });

  it('renders custom metadata labels', () => {
    renderWithIntl(
      <SignificantEventDetailHeader
        {...baseProps}
        criticalityLabel="Medium"
        criticalityColor="warning"
        impactLabel="Low"
        impactColor="success"
        recommendedActionLabel="Monitor"
      />
    );
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });
});
