/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { mockServices } from '../common/services/__mocks__/services.mock';
import {
  redirectDashboardOnlyLanding,
  shouldRedirectDashboardOnlyLanding,
  subscribeDashboardOnlyLanding,
} from './redirect_dashboard_only_landing';

const originalLocation = window.location;

const mockLocationPathname = (pathname: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname },
  });
};

describe('shouldRedirectDashboardOnlyLanding', () => {
  it.each(['/', '/app/security/get_started', '/app/security/get_started/'])(
    'returns true for dashboard-only users on %s',
    (pathname) => {
      expect(
        shouldRedirectDashboardOnlyLanding({
          pathname,
          canAccessGetStarted: false,
          canAccessDashboards: true,
        })
      ).toBe(true);
    }
  );

  it('returns false when the user can access Get started', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security/get_started',
        canAccessGetStarted: true,
        canAccessDashboards: true,
      })
    ).toBe(false);
  });

  it('returns false when the user cannot access dashboards', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/security/get_started',
        canAccessGetStarted: false,
        canAccessDashboards: false,
      })
    ).toBe(false);
  });

  it('returns false on a non-landing path', () => {
    expect(
      shouldRedirectDashboardOnlyLanding({
        pathname: '/app/discover',
        canAccessGetStarted: false,
        canAccessDashboards: true,
      })
    ).toBe(false);
  });
});

describe('redirectDashboardOnlyLanding', () => {
  const navigateToApp = mockServices.application.navigateToApp as jest.Mock;
  const removeBasePath = jest.spyOn(mockServices.http.basePath, 'remove');

  const setNavLinks = (navLinks: Record<string, boolean>) => {
    mockServices.application.capabilities = {
      ...mockServices.application.capabilities,
      navLinks,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setNavLinks({});
    removeBasePath.mockImplementation((pathname: string) => pathname);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('navigates dashboard-only users from Get started to dashboards', () => {
    mockLocationPathname('/s/default/app/security/get_started');
    removeBasePath.mockReturnValue('/app/security/get_started');
    setNavLinks({
      dashboards: true,
      securitySolutionUI: false,
    });

    redirectDashboardOnlyLanding(mockServices);

    expect(removeBasePath).toHaveBeenCalledWith('/s/default/app/security/get_started');
    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
  });

  it('does not navigate editors away from Get started', () => {
    mockLocationPathname('/app/security/get_started');
    setNavLinks({
      dashboards: true,
      securitySolutionUI: true,
    });

    redirectDashboardOnlyLanding(mockServices);

    expect(navigateToApp).not.toHaveBeenCalled();
  });
});

describe('subscribeDashboardOnlyLanding', () => {
  const navigateToApp = mockServices.application.navigateToApp as jest.Mock;
  const removeBasePath = jest.spyOn(mockServices.http.basePath, 'remove');
  const currentAppId$ = new Subject<string | undefined>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockServices.application.currentAppId$ = currentAppId$;
    mockServices.application.capabilities = {
      ...mockServices.application.capabilities,
      navLinks: {
        dashboards: true,
        securitySolutionUI: false,
      },
    };
    removeBasePath.mockImplementation((pathname: string) => pathname);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('redirects again when the user navigates back to Get started', () => {
    mockLocationPathname('/app/dashboards');
    const subscription = subscribeDashboardOnlyLanding(mockServices);
    expect(navigateToApp).not.toHaveBeenCalled();

    mockLocationPathname('/app/security/get_started');
    currentAppId$.next('securitySolutionUI');

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { replace: true });
    subscription.unsubscribe();
  });
});
