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

const renderPage = ({ canWrite = false }: { canWrite?: boolean } = {}) => {
  const core = coreMock.createStart();
  // coreMock.createStart() does not populate feature capabilities; set the
  // alertzero.write capability so the component can branch on it.
  (core.application.capabilities as Record<string, unknown>).alertzero = { write: canWrite };
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

  describe('with write capability', () => {
    it('renders the writable body copy', () => {
      renderPage({ canWrite: true });
      expect(
        screen.getByText(/Enable a Watch worker to start receiving investigations/)
      ).toBeInTheDocument();
    });

    it('renders a Configure Watches button that navigates to /watches', () => {
      const { history } = renderPage({ canWrite: true });
      const button = screen.getByRole('button', { name: 'Configure Watches' });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      expect(history.location.pathname).toBe('/watches');
    });
  });

  describe('without write capability (read-only user)', () => {
    it('renders the read-only body copy', () => {
      renderPage({ canWrite: false });
      expect(screen.getByText(/Ask an administrator to enable a Watch worker/)).toBeInTheDocument();
    });

    it('does not render the Configure Watches button', () => {
      renderPage({ canWrite: false });
      expect(screen.queryByRole('button', { name: 'Configure Watches' })).not.toBeInTheDocument();
    });
  });
});
