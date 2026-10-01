/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { AlertZeroRoutes } from './routes';

jest.mock('./pages/landing_page', () => ({
  LandingPage: () => <div data-test-subj="landing" />,
}));
jest.mock('./pages/escalations', () => ({ EscalationsPage: () => null }));
jest.mock('./pages/watches/watch_detail', () => ({ WatchDetailPage: () => null }));
jest.mock('./hooks/use_agentic_investigations_capabilities', () => ({
  useAgenticInvestigationsCapabilities: () => ({ showEscalations: true }),
}));

describe('AlertZeroRoutes', () => {
  it.each([
    '/alerts',
    '/settings',
    '/does/not/exist',
    '/watches/some-watch/extra',
    '/escalations/anything',
  ])('redirects %s to the root route', (path) => {
    let pathname = path;
    render(
      <MemoryRouter initialEntries={[path]}>
        <AlertZeroRoutes />
        <Route
          render={({ location }) => {
            pathname = location.pathname;
            return null;
          }}
        />
      </MemoryRouter>
    );

    expect(pathname).toBe('/');
    expect(screen.getByTestId('landing')).toBeInTheDocument();
  });
});
