/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, waitFor } from '@testing-library/react';
import React from 'react';

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

describe('HashDashboardLinkRedirect', () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/app/security/dashboards/current-id');
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(
      ({ path }: { path?: string }) => `/app/security/dashboards/${path}`
    );
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('does not navigate when there is no legacy hash dashboard link', () => {
    render(<HashDashboardLinkRedirect />);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it.each([['/dashboard/target-dashboard-id'], ['/view/target-dashboard-id']])(
    'redirects to the security dashboard url and clears the hash for %s',
    async (hashPath) => {
      window.location.hash = hashPath;

      render(<HashDashboardLinkRedirect />);

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith({
          url: '/app/security/dashboards/target-dashboard-id',
        })
      );
      // The broken hash link is cleared immediately (HashRouter settles back to its "root" `#/`
      // rather than leaving the legacy dashboard id visible); the subsequent real navigation to
      // the target url fully replaces the address bar, hash included.
      expect(window.location.hash).not.toContain('target-dashboard-id');
    }
  );
});
