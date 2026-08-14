/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import type { History } from 'history';
import { createBrowserHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';

import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useNavigateTo } from '../../common/lib/kibana';
import { HashDashboardLinkRedirect } from './hash_dashboard_link_redirect';

jest.mock('../../common/components/link_to', () => {
  const actual = jest.requireActual('../../common/components/link_to');
  return {
    ...actual,
    useGetSecuritySolutionUrl: jest.fn(),
  };
});

jest.mock('../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../common/lib/kibana');
  return {
    ...actual,
    useNavigateTo: jest.fn(),
  };
});

const renderWithScopedHistory = (routerBasename: string, initialPath: string) => {
  window.history.replaceState(null, '', `${routerBasename}${initialPath}`);
  const history: History = createBrowserHistory({ basename: routerBasename });
  const rendered = render(
    <Router history={history}>
      <HashDashboardLinkRedirect />
    </Router>
  );
  return { history, ...rendered };
};

describe('HashDashboardLinkRedirect', () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(
      ({ path }: { path?: string }) => `/app/security/dashboards/${path}`
    );
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('does not navigate when there is no legacy hash dashboard link', () => {
    renderWithScopedHistory('/app/security', '/dashboards/current-id');
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('does not inject a hash when mounting with an empty hash', () => {
    const { history } = renderWithScopedHistory('/app/security', '/dashboards/current-id');
    expect(history.location.hash).toBe('');
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it.each([['#/dashboard/target-dashboard-id'], ['#/view/target-dashboard-id']])(
    'redirects to the security dashboard url and clears the hash for %s',
    async (hash) => {
      const { history } = renderWithScopedHistory('/app/security', `/dashboards/current-id${hash}`);

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith({
          url: '/app/security/dashboards/target-dashboard-id',
        })
      );
      // The hash must be cleared without ever double-prepending the router's basename.
      expect(history.location.hash).toBe('');
      expect(window.location.pathname).toBe('/app/security/dashboards/current-id');
    }
  );

  it('redirects when the hash changes after mount', async () => {
    renderWithScopedHistory('/app/security', '/dashboards/current-id');
    expect(mockNavigateTo).not.toHaveBeenCalled();

    act(() => {
      window.location.hash = '#/dashboard/late-dashboard-id';
    });

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/late-dashboard-id',
      })
    );
  });

  it('does not double-prepend a custom server.basePath and space id when clearing the hash', async () => {
    // The router's basename mirrors a real deployment with `server.basePath: /custom-base` and
    // a non-default space folded into one prefix, e.g. `/custom-base/s/my-space/app/security`.
    const routerBasename = '/custom-base/s/my-space/app/security';
    const { history } = renderWithScopedHistory(
      routerBasename,
      '/dashboards/current-id#/dashboard/target-dashboard-id'
    );

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/target-dashboard-id',
      })
    );

    expect(history.location.hash).toBe('');
    expect(window.location.pathname).toBe(`${routerBasename}/dashboards/current-id`);
    // `history.createHref` prepends the router's basename exactly once.
    expect(history.createHref(history.location)).toBe(`${routerBasename}/dashboards/current-id`);
  });
});
