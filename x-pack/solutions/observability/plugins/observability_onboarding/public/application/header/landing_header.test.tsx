/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { LandingHeader } from './landing_header';

describe('LandingHeader', () => {
  it('renders the title, subtitle and the hero illustration left of the text', () => {
    render(
      <I18nProvider>
        <LandingHeader />
      </I18nProvider>
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Add Observability data' });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connect your systems and get full visibility into logs, metrics, and traces.'
      )
    ).toBeInTheDocument();

    const illustration = screen.getByTestId('obltOnboardingHomeIllustration');
    expect(illustration).toBeInTheDocument();
    // Design places the illustration before the text block (icon left, text right).
    expect(illustration.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
