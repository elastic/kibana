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
      expect(history.location.hash).toBe('');
    }
  );

  it.each([
    ['#/dashboard/target-dashboard-id/expanded-panel-id'],
    ['#/view/target-dashboard-id/expanded-panel-id'],
  ])('forwards the expanded panel id segment for %s', async (hash) => {
    renderWithScopedHistory('/app/security', `/dashboards/current-id${hash}`);

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/target-dashboard-id/expanded-panel-id',
      })
    );
  });

  it("forwards the target link's expanded panel id when the current page has its own panel id", async () => {
    renderWithScopedHistory(
      '/app/security',
      '/dashboards/current-id/current-panel-id#/dashboard/target-dashboard-id/target-panel-id'
    );

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/target-dashboard-id/target-panel-id',
      })
    );
  });

  it("drops the current page's own panel id when the target link has none", async () => {
    renderWithScopedHistory(
      '/app/security',
      '/dashboards/current-id/current-panel-id#/dashboard/target-dashboard-id'
    );

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/target-dashboard-id',
      })
    );
  });

  it('decodes an encoded expanded panel id', async () => {
    renderWithScopedHistory(
      '/app/security',
      '/dashboards/current-id#/dashboard/target-dashboard-id/expanded%3Apanel%3Aid'
    );

    await waitFor(() =>
      expect(mockNavigateTo).toHaveBeenCalledWith({
        url: '/app/security/dashboards/target-dashboard-id/expanded:panel:id',
      })
    );
  });

  it('does not navigate for a <script> payload split across both capture groups', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithScopedHistory(
      '/app/security',
      '/dashboards/current-id#/dashboard/%3Cscript%3Ealert(1)%3C/script%3E'
    );

    expect(mockNavigateTo).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it.each([
    ['contains spaces', 'OSSEC%20Rootkit%20Pack'],
    ['has malformed percent-encoding', '100%'],
    ['reintroduces a slash', 'target-id%2Fsome-other-path'],
    ['reintroduces a hash', 'target-id%23/other-id'],
  ])('does not navigate when the decoded dashboard id %s', (_reason, dashboardId) => {
    renderWithScopedHistory('/app/security', `/dashboards/current-id#/dashboard/${dashboardId}`);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it.each([
    ['out-of-charset characters', 'expanded%20panel%20id'],
    ['malformed percent-encoding', '100%'],
  ])(
    'drops an expanded panel id with %s but still redirects using the dashboard id',
    async (_reason, expandedPanelId) => {
      renderWithScopedHistory(
        '/app/security',
        `/dashboards/current-id#/dashboard/target-dashboard-id/${expandedPanelId}`
      );

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith({
          url: '/app/security/dashboards/target-dashboard-id',
        })
      );
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
  });
});
