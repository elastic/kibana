/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import {
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
} from '../../common/constants';
import { routes } from './routes';

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (...args: unknown[]) =>
    mockUseIsExperimentalFeatureEnabled(...args),
}));

jest.mock('../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../app/404', () => ({ NotFoundPage: () => null }));
jest.mock('../common/components/plugin_template_wrapper', () => ({
  PluginTemplateWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../common/components/security_route_page_wrapper', () => ({
  withSecurityRoutePageWrapper: (Component: React.ComponentType) => Component,
}));
jest.mock('./pages/entity_analytics_management_page', () => ({
  EntityAnalyticsManagementPage: () => null,
}));
jest.mock('./pages/entity_analytics_home_page', () => ({ EntityAnalyticsHomePage: () => null }));
jest.mock('./pages/entity_analytics_new_home_page', () => ({
  EntityAnalyticsNewHomePage: () => null,
}));

const mockFlags = (flags: Record<string, boolean>) => {
  mockUseIsExperimentalFeatureEnabled.mockImplementation((flag: string) => flags[flag] ?? false);
};

const renderRetiredPrivmonUrl = (search: string) => {
  const route = routes.find(
    ({ path }) => path === ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
  );
  if (!route) {
    throw new Error('Retired privileged user monitoring route is not registered');
  }
  const { component: RouteComponent } = route;
  const history = createMemoryHistory({
    initialEntries: [`${ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH}${search}`],
  });
  render(
    <Router history={history}>
      <RouteComponent />
    </Router>
  );
  return history;
};

describe('retired privileged user monitoring URL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      watchlists: true,
      entityStoreV2: true,
      expectedPathname: `${ENTITY_ANALYTICS_MANAGEMENT_PATH}/watchlists`,
    },
    {
      watchlists: true,
      entityStoreV2: false,
      expectedPathname: `${ENTITY_ANALYTICS_MANAGEMENT_PATH}/watchlists`,
    },
    {
      watchlists: false,
      entityStoreV2: true,
      expectedPathname: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    },
    {
      watchlists: false,
      entityStoreV2: false,
      expectedPathname: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    },
  ])(
    'redirects to $expectedPathname and keeps the query string when watchlists=$watchlists and entityStoreV2=$entityStoreV2',
    ({ watchlists, entityStoreV2, expectedPathname }) => {
      mockFlags({
        entityAnalyticsWatchlistEnabled: watchlists,
        entityAnalyticsEntityStoreV2: entityStoreV2,
      });

      const history = renderRetiredPrivmonUrl('?foo=bar');

      expect(history.location.pathname).toBe(expectedPathname);
      expect(history.location.search).toBe('?foo=bar');
    }
  );
});
