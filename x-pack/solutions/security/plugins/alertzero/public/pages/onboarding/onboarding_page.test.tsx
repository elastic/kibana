/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { OnboardingPage } from './onboarding_page';

const renderPage = () => {
  const core = coreMock.createStart();
  const history = createMemoryHistory();

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <Router history={history}>
            <OnboardingPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { history };
};

describe('OnboardingPage', () => {
  it('renders the title', () => {
    renderPage();
    expect(screen.getByText('Get started with AlertZero')).toBeInTheDocument();
  });

  it('renders the body copy', () => {
    renderPage();
    expect(
      screen.getByText(/Enable a Watch worker to start receiving investigations/)
    ).toBeInTheDocument();
  });

  it('renders a Configure Watches button that navigates to /watches', () => {
    const { history } = renderPage();
    const button = screen.getByRole('button', { name: 'Configure Watches' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(history.location.pathname).toBe('/watches');
  });
});
