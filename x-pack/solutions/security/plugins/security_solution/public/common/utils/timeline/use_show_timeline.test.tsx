/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { updateAppLinks } from '../../links';
import { appLinks } from '../../../app_links';
import { useUserPrivileges } from '../../components/user_privileges';
import { useShowTimeline } from './use_show_timeline';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { TestProviders } from '../../mock';
import { hasAccessToSecuritySolution } from '../../../helpers_access';

jest.mock('../../components/user_privileges');
jest.mock('../../../helpers_access', () => ({ hasAccessToSecuritySolution: jest.fn(() => true) }));

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/overview' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

const mockUseSourcererDataView = jest.fn(
  (): { indicesExist: boolean; dataViewId: string | null } => ({
    indicesExist: true,
    dataViewId: null,
  })
);
jest.mock('../../../sourcerer/containers', () => ({
  useSourcererDataView: () => mockUseSourcererDataView(),
}));

const mockUpselling = new UpsellingService();
const mockUiSettingsClient = uiSettingsServiceMock.createStartContract();

const renderUseShowTimeline = () => renderHook(() => useShowTimeline(), { wrapper: TestProviders });

describe('use show timeline', () => {
  beforeAll(() => {
    (useUserPrivileges as unknown as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });

    // initialize all App links before running test
    updateAppLinks(appLinks, {
      experimentalFeatures: allowedExperimentalValues,
      capabilities: {
        navLinks: {},
        management: {},
        catalogue: {},
        actions: { show: true, crud: true },
        siemV2: {
          show: true,
          crud: true,
          detections: true,
        },
      },
      upselling: mockUpselling,
      uiSettingsClient: mockUiSettingsClient,
    });
  });

  it('shows timeline for routes on default', async () => {
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([true]));
  });

  it('hides timeline for blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/rules/add_rules' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([false]));
  });

  it('shows timeline for partial blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/rules' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([true]));
  });

  it('hides timeline for sub blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/administration/policy' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([false]));
  });
  it('hides timeline for users without timeline access', async () => {
    (useUserPrivileges as unknown as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: false },
    });

    const { result } = renderUseShowTimeline();
    const showTimeline = result.current;
    expect(showTimeline).toEqual([false]);
  });
});
it('shows timeline for users with timeline read access', async () => {
  (useUserPrivileges as unknown as jest.Mock).mockReturnValue({
    timelinePrivileges: { read: true },
  });

  const { result } = renderUseShowTimeline();
  const showTimeline = result.current;
  expect(showTimeline).toEqual([true]);
});

describe('sourcererDataView', () => {
  it('should show timeline when indices exist', () => {
    mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: true, dataViewId: 'test' });
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should show timeline when dataViewId is null', () => {
    mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: false, dataViewId: null });
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should not show timeline when dataViewId is not null and indices does not exist', () => {
    mockUseSourcererDataView.mockReturnValueOnce({ indicesExist: false, dataViewId: 'test' });
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([false]);
  });
});

describe('Security solution capabilities', () => {
  it('should show timeline when user has read capabilities', () => {
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should not show timeline when user does not have read capabilities', () => {
    jest.mocked(hasAccessToSecuritySolution).mockReturnValueOnce(false);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([false]);
  });
});
