/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DashboardApi, RedirectToProps } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useSaveAsDashboardMenu } from './use_save_as_dashboard_menu';

jest.mock('../../hooks/use_kibana_services');

const navigate = jest.fn();
const get = jest.fn();
const runInteractiveSave = jest.fn();
const dashboardApi = { runInteractiveSave } as unknown as DashboardApi;

const useServices = ({ showWriteControls = true }: { showWriteControls?: boolean } = {}) => {
  get.mockReturnValue({ navigate });
  jest.mocked(useKibanaServices).mockReturnValue({
    share: { url: { locators: { get } } },
    application: { capabilities: { dashboard_v2: { showWriteControls } } },
  } as unknown as ReturnType<typeof useKibanaServices>);
};

const renderMenu = (api: DashboardApi | undefined) =>
  renderHook(() => useSaveAsDashboardMenu(api)).result.current;

/** Runs the save action and returns the redirect it gave the save modal. */
const save = (): ((redirect: RedirectToProps) => void) => {
  const item = renderMenu(dashboardApi)?.items?.[0];
  if (!item || !('run' in item) || !item.run) {
    throw new Error('No save action');
  }
  item.run({} as never);
  return runInteractiveSave.mock.lastCall?.[0];
};

beforeEach(() => {
  jest.resetAllMocks();
  useServices();
});

describe('useSaveAsDashboardMenu', () => {
  it('has no action before the dashboard loads', () => {
    expect(renderMenu(undefined)).toBeUndefined();
  });

  it('has no action without the privilege to save dashboards', () => {
    useServices({ showWriteControls: false });

    expect(renderMenu(dashboardApi)).toBeUndefined();
  });

  it('opens the save modal of the dashboard', () => {
    save();

    expect(get).toHaveBeenCalledWith(DASHBOARD_APP_LOCATOR);
    expect(runInteractiveSave).toHaveBeenCalledTimes(1);
  });

  it('opens the saved dashboard', () => {
    save()({ destination: 'dashboard', id: 'saved-id' });

    expect(navigate).toHaveBeenCalledWith({ dashboardId: 'saved-id' });
  });

  it('stays on the page for any other redirect', () => {
    const redirect = save();
    redirect({ destination: 'listing' });
    redirect({ destination: 'dashboard' });

    expect(navigate).not.toHaveBeenCalled();
  });
});
