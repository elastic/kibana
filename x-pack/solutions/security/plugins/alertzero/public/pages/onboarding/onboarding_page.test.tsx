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
    renderPage({ canWrite: true });
    expect(screen.getByText('Enable your workers')).toBeInTheDocument();
  });

  describe('with write capability', () => {
    it('renders the subtitle', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/Choose the workers you need/)).toBeInTheDocument();
    });

    it('renders worker toggle rows', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      expect(screen.getByText('Alert Triage')).toBeInTheDocument();
    });

    it('renders the Before you enable callout', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText('Before you enable')).toBeInTheDocument();
    });

    it('renders the Enable and continue button that navigates to /watches', () => {
      const { history } = renderPage({ canWrite: true });
      const button = screen.getByRole('button', { name: 'Enable and continue' });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      expect(history.location.pathname).toBe('/watches');
    });

    it('renders the Not now link', () => {
      renderPage({ canWrite: true });
      expect(screen.getByText(/Not now/)).toBeInTheDocument();
    });

    it('disables a toggle when it is the last enabled worker', () => {
      renderPage({ canWrite: true });

      // Toggle all workers off except one
      const toggles = screen.getAllByRole('switch');
      // Disable all but the first by clicking them
      for (let i = 1; i < toggles.length; i++) {
        fireEvent.click(toggles[i]);
      }

      // The first (and now only enabled) toggle should be disabled
      expect(toggles[0]).toBeDisabled();
    });
  });

  describe('without write capability (read-only user)', () => {
    it('renders the read-only body copy', () => {
      renderPage({ canWrite: false });
      expect(screen.getByText(/Ask an administrator to enable a Watch worker/)).toBeInTheDocument();
    });

    it('does not render the worker toggle list', () => {
      renderPage({ canWrite: false });
      expect(screen.queryByTestId(/alertZeroOnboardingWorkerToggle/)).not.toBeInTheDocument();
    });
  });
});
