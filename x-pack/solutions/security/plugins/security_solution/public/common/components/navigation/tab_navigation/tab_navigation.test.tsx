/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import React from 'react';
import { navTabsHostDetails } from '../../../../explore/hosts/pages/details/nav_tabs';
import { HostsTableType } from '../../../../explore/hosts/store/model';
import { TabNavigationComponent } from './tab_navigation';
import type { TabNavigationProps } from './types';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';

jest.mock('@kbn/security-solution-navigation/src/context');

mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
);

const mockUseRouteSpy = jest.fn();
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

const SEARCH_QUERY = '?search=test';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn(() => ({
      search: SEARCH_QUERY,
    })),
  };
});

const hostName = 'siem-window';

describe('Table Navigation', () => {
  const mockHasMlUserPermissions = true;
  mockUseRouteSpy.mockReturnValue([{ tabName: HostsTableType.authentications }]);

  const mockProps: TabNavigationProps = {
    navTabs: navTabsHostDetails({
      hostName,
      hasMlUserPermissions: mockHasMlUserPermissions,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders with correct tab highlighted', () => {
    render(<TabNavigationComponent {...mockProps} />);
    expect(screen.getByTestId(`navigation-${HostsTableType.authentications}`)).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId(`navigation-${HostsTableType.events}`)).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  test('it carries the url state in the link', () => {
    render(<TabNavigationComponent {...mockProps} />);

    const firstTab = screen.getByTestId(`navigation-${HostsTableType.authentications}`);
    expect(firstTab).toHaveAttribute(
      'href',
      `/app/securitySolutionUI/hosts/name/siem-window/authentications${SEARCH_QUERY}`
    );
  });
});
