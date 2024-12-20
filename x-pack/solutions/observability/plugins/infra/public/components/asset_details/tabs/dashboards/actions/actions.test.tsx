/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditDashboard, UnlinkDashboard, LinkDashboard } from '.';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import * as hooks from '../../../hooks/use_saved_objects_permissions';

const TEST_CURRENT_DASHBOARD = {
  title: 'Test Dashboard',
  id: 'test-so-id',
  dashboardSavedObjectId: 'test-dashboard-id',
  assetType: 'host',
  dashboardFilterAssetIdEnabled: true,
} as const;

jest.mock('../../../hooks/use_tab_switcher');

const tabSwitcherContextHookMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

describe('Custom Dashboards Actions', () => {
  const mockUseSearchSession = () => {
    tabSwitcherContextHookMock.mockReturnValue({
      ...tabSwitcherContextHookMock(),
      isActiveTab: jest.fn(() => true),
    });
  };

  beforeAll(() => {
    mockUseSearchSession();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render the edit dashboard action when the user can edit', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: true,
      canDelete: true,
    }));
    render(
      <EditDashboard
        onRefresh={() => {}}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        assetType="host"
      />
    );
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toHaveTextContent(
      'Edit dashboard link'
    );
  });
  it('should render the edit dashboard action when the user cannot edit', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: false,
      canDelete: true,
    }));
    render(
      <EditDashboard
        onRefresh={() => {}}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        assetType="host"
      />
    );

    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toHaveTextContent(
      'Edit dashboard link'
    );
  });
  it('should render the link dashboard action when the user can link a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: true,
      canDelete: true,
    }));
    render(<LinkDashboard onRefresh={() => {}} assetType="host" />);

    expect(screen.getByTestId('infraAddDashboard')).not.toBeDisabled();
    expect(screen.getByTestId('infraAddDashboard')).toHaveTextContent('Link dashboard');
  });
  it('should render the link dashboard action when the user cannot link a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: false,
      canDelete: true,
    }));
    render(<LinkDashboard onRefresh={() => {}} assetType="host" />);

    expect(screen.getByTestId('infraAddDashboard')).toBeDisabled();
    expect(screen.getByTestId('infraAddDashboard')).toHaveTextContent('Link dashboard');
  });
  it('should render the link new dashboard action when the user can link a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: true,
      canDelete: true,
    }));
    render(<LinkDashboard onRefresh={() => {}} newDashboardButton assetType="host" />);
    expect(screen.getByTestId('infraLinkDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraLinkDashboardMenu')).toHaveTextContent('Link new dashboard');
  });
  it('should render the link new dashboard action when the user cannot link a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: false,
      canDelete: true,
    }));
    render(<LinkDashboard onRefresh={() => {}} newDashboardButton assetType="host" />);
    expect(screen.getByTestId('infraLinkDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraLinkDashboardMenu')).toHaveTextContent('Link new dashboard');
  });
  it('should render the unlink dashboard action when the user can unlink a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: true,
      canDelete: true,
    }));
    render(
      <UnlinkDashboard
        onRefresh={() => {}}
        assetType="host"
        currentDashboard={TEST_CURRENT_DASHBOARD}
      />
    );
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toHaveTextContent('Unlink dashboard');
  });
  it('should render the unlink dashboard action when the user cannot unlink a dashboard', () => {
    jest.spyOn(hooks, 'useSavedObjectUserPermissions').mockImplementation(() => ({
      canSave: true,
      canDelete: false,
    }));
    render(
      <UnlinkDashboard
        onRefresh={() => {}}
        assetType="host"
        currentDashboard={TEST_CURRENT_DASHBOARD}
      />
    );
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toHaveTextContent('Unlink dashboard');
  });
});
