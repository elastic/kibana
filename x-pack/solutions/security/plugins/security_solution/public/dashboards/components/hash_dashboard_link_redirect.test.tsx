/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { useHistory } from 'react-router-dom';

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

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: jest.fn(),
  };
});

describe('HashDashboardLinkRedirect', () => {
  const mockNavigateTo = jest.fn();
  const mockHistoryReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/app/security/dashboards/current-id');
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(
      ({ path }: { path?: string }) => `/app/security/dashboards/${path}`
    );
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
    (useHistory as jest.Mock).mockReturnValue({ replace: mockHistoryReplace });
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('does not navigate when there is no legacy hash dashboard link', () => {
    render(<HashDashboardLinkRedirect />);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('does not inject a hash when mounting with an empty hash', () => {
    render(<HashDashboardLinkRedirect />);
    expect(window.location.hash).toBe('');
    expect(mockHistoryReplace).not.toHaveBeenCalled();
  });

  it.each([['#/dashboard/target-dashboard-id'], ['#/view/target-dashboard-id']])(
    'redirects to the security dashboard url and clears the hash for %s',
    async (hash) => {
      window.history.replaceState(null, '', `/app/security/dashboards/current-id${hash}`);

      render(<HashDashboardLinkRedirect />);

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith({
          url: '/app/security/dashboards/target-dashboard-id',
        })
      );
      // The hash must be cleared through the router's own `history` instance (not the raw
      // `window.history` API) so the router's location stays in sync with the `navigateTo()`
      // call above.
      expect(mockHistoryReplace).toHaveBeenCalledWith('/app/security/dashboards/current-id');
    }
  );

  it('redirects when the hash changes after mount', async () => {
    render(<HashDashboardLinkRedirect />);
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
});
