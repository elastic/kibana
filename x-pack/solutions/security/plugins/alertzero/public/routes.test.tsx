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
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/alertzero-common';
import { AlertZeroRoutes } from './routes';

jest.mock('./pages/landing_page', () => ({
  LandingPage: () => <div data-test-subj="landing" />,
}));
jest.mock('./pages/escalations', () => ({ EscalationsPage: () => null }));
jest.mock('./pages/watches/watch_detail', () => ({ WatchDetailPage: () => null }));
jest.mock('./hooks/use_alertzero_investigations_capabilities', () => ({
  useAlertZeroInvestigationsCapabilities: () => ({ showEscalations: true }),
}));

const renderAt = (path: string) => {
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
  return () => pathname;
};

describe('AlertZeroRoutes', () => {
  it.each(['/alerts', '/settings', '/does/not/exist', '/escalations/anything'])(
    'redirects %s to the root route',
    (path) => {
      const getPathname = renderAt(path);

      expect(getPathname()).toBe('/');
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    }
  );

  it('redirects an unknown path below a watch to the default watch', () => {
    const getPathname = renderAt('/watches/some-watch/extra');

    expect(getPathname()).toBe(`/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`);
  });
});
