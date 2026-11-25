/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CREATE_DASHBOARD_MENU_ITEM_TEST_ID,
  useDashboardsHeaderMenu,
} from './use_dashboards_header_menu';
import { useCreateSecurityDashboardLink } from '../../hooks/use_create_security_dashboard_link';
import { useNavigateTo } from '../../../common/lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../common/lib/telemetry';

jest.mock('../../hooks/use_create_security_dashboard_link');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/lib/telemetry', () => ({
  ...jest.requireActual('../../../common/lib/telemetry'),
  track: jest.fn(),
}));

const URL = '/path/to/create';
const mockNavigateTo = jest.fn();

describe('useDashboardsHeaderMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCreateSecurityDashboardLink as jest.Mock).mockReturnValue({ isLoading: false, url: URL });
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
  });

  it('returns an empty menu when the user cannot create dashboards', () => {
    const { result } = renderHook(() => useDashboardsHeaderMenu({ canCreateDashboard: false }));

    expect(result.current).toEqual({});
  });

  it('returns the "Create Dashboard" primary action linking to the create url', () => {
    const { result } = renderHook(() => useDashboardsHeaderMenu({ canCreateDashboard: true }));

    expect(result.current.primaryActionItem).toEqual(
      expect.objectContaining({
        href: URL,
        disableButton: false,
        testId: CREATE_DASHBOARD_MENU_ITEM_TEST_ID,
      })
    );
  });

  it('disables the primary action while the create url is loading', () => {
    (useCreateSecurityDashboardLink as jest.Mock).mockReturnValue({ isLoading: true, url: '' });

    const { result } = renderHook(() => useDashboardsHeaderMenu({ canCreateDashboard: true }));

    expect(result.current.primaryActionItem?.disableButton).toBe(true);
  });

  it('tracks telemetry and navigates in-app when run', () => {
    const { result } = renderHook(() => useDashboardsHeaderMenu({ canCreateDashboard: true }));

    result.current.primaryActionItem?.run?.();

    expect(track).toHaveBeenCalledWith(METRIC_TYPE.CLICK, TELEMETRY_EVENT.CREATE_DASHBOARD);
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: URL });
  });
});
