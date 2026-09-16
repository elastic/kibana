/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { mockServices } from '../common/services/__mocks__/services.mock';
import {
  canAccessDashboardsApp,
  canAccessDiscoverApp,
  getRestrictedLandingAppId,
  redirectDashboardOnlyLanding,
  shouldRedirectDashboardOnlyLanding,
  subscribeDashboardOnlyLanding,
} from './redirect_dashboard_only_landing';

jest.mock('@kbn/security-solution-plugin/common', () => ({
  ...jest.requireActual('@kbn/security-solution-plugin/common'),
  isSecuritySolutionAccessible: ({ siemV5 }: { siemV5?: { show?: boolean } }) =>
    Boolean(siemV5?.show),
}));

const setCapabilities = (overrides: {
  navLinks?: Record<string, boolean>;
  siemV5?: Record<string, boolean>;
  dashboard_v2?: Record<string, boolean>;
  discover_v2?: Record<string, boolean>;
}) => {
  mockServices.application.capabilities = {
    ...mockServices.application.capabilities,
    ...overrides,
  };
};

describe('canAccessDashboardsApp', () => {
  it('returns true for dashboard_v2.show', () => {
    expect(canAccessDashboardsApp({ dashboard_v2: { show: true } } as never)).toBe(true);
  });

  it('returns false when only navLinks.dashboards is set', () => {
    expect(canAccessDashboardsApp({ navLinks: { dashboards: true } } as never)).toBe(false);
  });
});

describe('canAccessDiscoverApp', () => {
  it('returns true for discover_v2.show', () => {
    expect(canAccessDiscoverApp({ discover_v2: { show: true } } as never)).toBe(true);
  });

  it('returns false when only navLinks.discover is set', () => {
    expect(canAccessDiscoverApp({ navLinks: { discover: true } } as never)).toBe(false);
  });
});

describe('getRestrictedLandingAppId', () => {
  it('prefers dashboards over discover', () => {
    expect(
      getRestrictedLandingAppId({
        canAccessGetStarted: false,
        canAccessDashboards: true,
        canAccessDiscover: true,
      })
    ).toBe('dashboards');
  });

  it('falls back to discover when dashboards are not granted', () => {
    expect(
      getRestrictedLandingAppId({
        canAccessGetStarted: false,
        canAccessDashboards: false,
        canAccessDiscover: true,
      })
    ).toBe('discover');
  });

  it('returns undefined when the user can access Get started', () => {
    expect(
      getRestrictedLandingAppId({
        canAccessGetStarted: true,
        canAccessDashboards: true,
        canAccessDiscover: true,
      })
    ).toBeUndefined();
  });
});

describe('shouldRedirectDashboardOnlyLanding', () => {
  it.each(['/', '/app/security/get_started', '/app/security/get_started/'])(
    'returns true for dashboard-only users on %s',
    (pathname) => {
      expect(
        shouldRedirectDashboardOnlyLanding({
          pathname,
          canAccessGetStarted: false,
          canAccessDashboards: true,
          canAccessDiscover: false,
        })
      ).toBe(true);
    }
  );

  it('returns true for discover-only users on Get started', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security/get_started',
        canAccessGetStarted: false,
        canAccessDashboards: false,
        canAccessDiscover: true,
      })
    ).toBe(true);
  });

  it('returns false when the user can access Get started', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security/get_started',
        canAccessGetStarted: true,
        canAccessDashboards: true,
        canAccessDiscover: true,
      })
    ).toBe(false);
  });

  it('returns false when the user cannot access dashboards or discover', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security/get_started',
        canAccessGetStarted: false,
        canAccessDashboards: false,
        canAccessDiscover: false,
      })
    ).toBe(false);
  });

  it('returns false on a non-landing path', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/discover',
        canAccessGetStarted: false,
        canAccessDashboards: true,
        canAccessDiscover: false,
      })
    ).toBe(false);
  });

  it('returns true for the Security app root', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security',
        canAccessGetStarted: false,
        canAccessDashboards: true,
        canAccessDiscover: false,
      })
    ).toBe(true);
  });
});

describe('redirectDashboardOnlyLanding', () => {
  const navigateToApp = mockServices.application.navigateToApp as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setCapabilities({
      navLinks: {},
      siemV5: {},
      dashboard_v2: {},
      discover_v2: {},
    });
  });

  it('navigates dashboard-only users from Get started to dashboards', () => {
    setCapabilities({
      navLinks: {
        dashboards: true,
        securitySolutionUI: true,
      },
      dashboard_v2: { show: true },
    });

    redirectDashboardOnlyLanding(mockServices, '/app/security/get_started');

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
  });

  it('strips a hash from the emitted location before matching', () => {
    setCapabilities({
      dashboard_v2: { show: true },
    });

    redirectDashboardOnlyLanding(mockServices, '/app/security/get_started#/');

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
  });

  it('navigates discover-only users from Get started to discover', () => {
    setCapabilities({
      navLinks: { securitySolutionUI: true },
      discover_v2: { show: true },
    });

    redirectDashboardOnlyLanding(mockServices, '/app/security/get_started');

    expect(navigateToApp).toHaveBeenCalledWith('discover', { replace: true });
  });

  it('does not treat navLinks.securitySolutionUI as Get started access', () => {
    setCapabilities({
      navLinks: { securitySolutionUI: true },
      dashboard_v2: { show: true },
    });

    redirectDashboardOnlyLanding(mockServices, '/app/security/get_started');

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
  });

  it('does not navigate editors away from Get started', () => {
    setCapabilities({
      navLinks: {
        dashboards: true,
        securitySolutionUI: true,
      },
      siemV5: { show: true },
      dashboard_v2: { show: true },
    });

    redirectDashboardOnlyLanding(mockServices, '/app/security/get_started');

    expect(navigateToApp).not.toHaveBeenCalled();
  });
});

describe('subscribeDashboardOnlyLanding', () => {
  const navigateToApp = mockServices.application.navigateToApp as jest.Mock;
  const currentLocation$ = new Subject<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockServices.application.currentLocation$ = currentLocation$;
    setCapabilities({
      navLinks: {
        dashboards: true,
        securitySolutionUI: true,
      },
      dashboard_v2: { show: true },
      siemV5: {},
    });
  });

  it('redirects when location emits Get started for an inaccessible Security app', () => {
    const subscription = subscribeDashboardOnlyLanding(mockServices);
    expect(navigateToApp).not.toHaveBeenCalled();

    currentLocation$.next('/app/security/get_started');

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
    subscription.unsubscribe();
  });
});
