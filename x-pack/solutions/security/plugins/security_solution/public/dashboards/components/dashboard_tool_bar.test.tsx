/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardToolBar } from './dashboard_tool_bar';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DashboardTopNav } from '@kbn/dashboard-plugin/public';
import { APP_NAME } from '../../../common/constants';
import { NavigationProvider, SecurityPageName } from '@kbn/security-solution-navigation';
import { TestProviders } from '../../common/mock';
import { useNavigation } from '../../common/lib/kibana';
import { BehaviorSubject } from 'rxjs';
import type { DashboardInternalApi } from '@kbn/dashboard-plugin/public/dashboard_api/types';

const mockDashboardTopNav = DashboardTopNav as Mock;

vi.mock('../../common/lib/kibana', async () => {
  const actual = (await vi.importActual('../../common/lib/kibana'));
  return {
    ...actual,
    useNavigation: vi.fn(),
    useCapabilities: vi.fn(() => ({ showWriteControls: true })),
  };
});
vi.mock('../../common/components/link_to', () => {
      const mocked = { useGetSecuritySolutionUrl: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/dashboard-plugin/public', () => {
      const mocked = {
      DashboardTopNav: vi.fn(() => <div data-test-subj="dashboard-top-nav" />),
    };
      return { ...mocked, default: mocked };
    });
const mockCore = coreMock.createStart();
const mockNavigateTo = vi.fn();
const mockGetAppUrl = vi.fn();
const mockDashboardContainer = {
  viewMode$: new BehaviorSubject('view'),
} as unknown as DashboardApi;
const mockDashboardInternalApi = {} as unknown as DashboardInternalApi;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <NavigationProvider core={mockCore}>{children}</NavigationProvider>
  </TestProviders>
);

describe('DashboardToolBar', () => {
  const mockOnLoad = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigation as Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
      getAppUrl: mockGetAppUrl,
    });
    render(
      <DashboardToolBar
        onLoad={mockOnLoad}
        dashboardContainer={mockDashboardContainer}
        dashboardInternalApi={mockDashboardInternalApi}
      />,
      {
        wrapper,
      }
    );
  });
  it('should render the DashboardToolBar component', () => {
    expect(screen.getByTestId('dashboard-top-nav')).toBeInTheDocument();
  });

  it('should render the DashboardToolBar component with the correct props for view mode', () => {
    expect(mockOnLoad).toHaveBeenCalledWith('view');
  });

  it('should render the DashboardTopNav component with the correct redirect to listing url', () => {
    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'listing' });
  });

  it('should render the DashboardTopNav component with the correct breadcrumb', () => {
    expect(mockGetAppUrl.mock.calls[0][0].deepLinkId).toEqual(SecurityPageName.landing);
    expect(mockDashboardTopNav.mock.calls[0][0].customLeadingBreadCrumbs[0].text).toEqual(APP_NAME);
  });

  it('should render the DashboardTopNav component with the correct redirect to create dashboard url', () => {
    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'dashboard' });

    expect(mockNavigateTo.mock.calls[0][0].deepLinkId).toEqual(SecurityPageName.dashboards);
    expect(mockNavigateTo.mock.calls[0][0].path).toEqual(`/create`);
  });

  it('should render the DashboardTopNav component with the correct redirect to edit dashboard url', () => {
    const mockDashboardId = 'dashboard123';

    mockDashboardTopNav.mock.calls[0][0].redirectTo({
      destination: 'dashboard',
      id: mockDashboardId,
    });
    expect(mockNavigateTo.mock.calls[0][0].deepLinkId).toEqual(SecurityPageName.dashboards);
    expect(mockNavigateTo.mock.calls[0][0].path).toEqual(`${mockDashboardId}/edit`);
  });

  it('should render the DashboardTopNav component with the correct props', () => {
    expect(mockDashboardTopNav.mock.calls[0][0].embedSettings).toEqual(
      expect.objectContaining({
        forceHideFilterBar: true,
        forceShowTopNavMenu: true,
        forceShowDatePicker: false,
        forceShowQueryInput: false,
      })
    );
  });
});
