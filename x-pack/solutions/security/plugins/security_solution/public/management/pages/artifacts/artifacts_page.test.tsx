/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BLOCKLIST_PATH,
  ENDPOINT_EXCEPTIONS_PATH,
  EVENT_FILTERS_PATH,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  TRUSTED_APPS_PATH,
} from '../../../../common/constants';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { EndpointPrivileges } from '../../../../common/endpoint/types';
import { ArtifactsPage } from './artifacts_page';
import {
  BLOCKLIST_TAB,
  ENDPOINT_EXCEPTIONS_TAB,
  EVENT_FILTERS_TAB,
  HOST_ISOLATION_EXCEPTIONS_TAB,
  TRUSTED_APPS_TAB,
  TRUSTED_DEVICES_TAB,
} from '../../common/translations';
import { useHostIsolationExceptionsAccess } from '../../hooks/artifacts/use_host_isolation_exceptions_access';

jest.mock('../../../common/components/user_privileges');
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

jest.mock('../../hooks/artifacts/use_host_isolation_exceptions_access');
const mockUseHostIsolationExceptionsAccess =
  useHostIsolationExceptionsAccess as jest.MockedFunction<typeof useHostIsolationExceptionsAccess>;

jest.mock('../endpoint_exceptions/view/endpoint_exceptions', () => ({
  EndpointExceptions: () => (
    <div data-test-subj="artifacts-stub-endpointExceptions">{'endpoint-exceptions'}</div>
  ),
}));

jest.mock('../trusted_apps/view/trusted_apps_list', () => ({
  TrustedAppsList: () => <div data-test-subj="artifacts-stub-trustedApps">{'trusted-apps'}</div>,
}));

jest.mock('../trusted_devices/view/trusted_devices_list', () => ({
  TrustedDevicesList: () => (
    <div data-test-subj="artifacts-stub-trustedDevices">{'trusted-devices'}</div>
  ),
}));

jest.mock('../event_filters/view/event_filters_list', () => ({
  EventFiltersList: () => <div data-test-subj="artifacts-stub-eventFilters">{'event-filters'}</div>,
}));

jest.mock('../host_isolation_exceptions/view/host_isolation_exceptions_list', () => ({
  HostIsolationExceptionsList: () => (
    <div data-test-subj="artifacts-stub-hostIsolationExceptions">{'host-isolation'}</div>
  ),
}));

jest.mock('../blocklist/view/blocklist', () => ({
  Blocklist: () => <div data-test-subj="artifacts-stub-blocklist">{'blocklist'}</div>,
}));

const fullArtifactReadPrivileges: Partial<EndpointPrivileges> = {
  canReadEndpointExceptions: true,
  canReadTrustedApplications: true,
  canReadTrustedDevices: true,
  canReadEventFilters: true,
  canReadHostIsolationExceptions: true,
  canAccessHostIsolationExceptions: true,
  canReadBlocklist: true,
};

describe('ArtifactsPage', () => {
  let mockedContext: AppContextTestRender;
  let history: AppContextTestRender['history'];
  let renderResult: ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    mockedContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: true,
      trustedDevices: true,
    });
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: fullArtifactReadPrivileges,
    });
    mockUseHostIsolationExceptionsAccess.mockReturnValue({
      hasAccessToHostIsolationExceptions: true,
      isHostIsolationExceptionsAccessLoading: false,
    });
  });

  afterEach(() => {
    mockUseUserPrivileges.mockReset();
    mockUseHostIsolationExceptionsAccess.mockReset();
  });

  const renderArtifactsAtPath = (path: string) => {
    act(() => {
      history.push(path);
    });
    return mockedContext.render(<ArtifactsPage />);
  };

  it('renders a single Artifacts page with the default tab matching the URL (trusted apps)', async () => {
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifactsPage')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    const selectedTab = within(tabs).getByRole('tab', { selected: true });
    expect(selectedTab).toHaveTextContent(TRUSTED_APPS_TAB);
    expect(renderResult.getByTestId('artifacts-stub-trustedApps')).toBeInTheDocument();
  });

  it('shows all artifact tabs when privileges and feature flags allow', async () => {
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: ENDPOINT_EXCEPTIONS_TAB })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: TRUSTED_APPS_TAB })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: TRUSTED_DEVICES_TAB })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: EVENT_FILTERS_TAB })).toBeInTheDocument();
    expect(
      within(tabs).getByRole('tab', { name: HOST_ISOLATION_EXCEPTIONS_TAB })
    ).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: BLOCKLIST_TAB })).toBeInTheDocument();
  });

  it('deep link opens the correct tab and content (event filters)', async () => {
    renderResult = renderArtifactsAtPath(EVENT_FILTERS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-eventFilters')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { selected: true })).toHaveTextContent(EVENT_FILTERS_TAB);
    expect(history.location.pathname).toBe(EVENT_FILTERS_PATH);
  });

  it('deep link opens blocklist tab from URL', async () => {
    renderResult = renderArtifactsAtPath(BLOCKLIST_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-blocklist')).toBeInTheDocument();
    });

    expect(history.location.pathname).toBe(BLOCKLIST_PATH);
  });

  it('switches tabs and updates URL and content when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-trustedApps')).toBeInTheDocument();
    });

    await user.click(
      within(renderResult.getByRole('tablist')).getByRole('tab', { name: BLOCKLIST_TAB })
    );

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-blocklist')).toBeInTheDocument();
    });
    expect(history.location.pathname).toBe(BLOCKLIST_PATH);
    expect(renderResult.queryByTestId('artifacts-stub-trustedApps')).not.toBeInTheDocument();
  });

  it('supports browser back and forward between artifact tabs', async () => {
    const user = userEvent.setup();
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-trustedApps')).toBeInTheDocument();
    });

    await user.click(
      within(renderResult.getByRole('tablist')).getByRole('tab', { name: ENDPOINT_EXCEPTIONS_TAB })
    );

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-endpointExceptions')).toBeInTheDocument();
    });
    expect(history.location.pathname).toBe(ENDPOINT_EXCEPTIONS_PATH);

    act(() => {
      history.goBack();
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-trustedApps')).toBeInTheDocument();
    });
    expect(history.location.pathname).toBe(TRUSTED_APPS_PATH);

    act(() => {
      history.goForward();
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-endpointExceptions')).toBeInTheDocument();
    });
    expect(history.location.pathname).toBe(ENDPOINT_EXCEPTIONS_PATH);
  });

  it('hides Endpoint exceptions tab when endpointExceptionsMovedUnderManagement is off', async () => {
    mockedContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: false,
      trustedDevices: true,
    });
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    expect(
      within(tabs).queryByRole('tab', { name: ENDPOINT_EXCEPTIONS_TAB })
    ).not.toBeInTheDocument();
  });

  it('hides Trusted devices tab when trustedDevices feature is off', async () => {
    mockedContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: true,
      trustedDevices: false,
    });
    renderResult = renderArtifactsAtPath(TRUSTED_APPS_PATH);

    await waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    expect(within(tabs).queryByRole('tab', { name: TRUSTED_DEVICES_TAB })).not.toBeInTheDocument();
  });

  it('defaults to first visible tab when URL does not match an artifact tab', async () => {
    renderResult = renderArtifactsAtPath('/administration/unknown_artifact_path');

    await waitFor(() => {
      expect(renderResult.getByTestId('artifacts-stub-endpointExceptions')).toBeInTheDocument();
    });

    const tabs = renderResult.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { selected: true })).toHaveTextContent(
      ENDPOINT_EXCEPTIONS_TAB
    );
  });

  it('shows no privileges page when host isolation exceptions URL is visited without access', async () => {
    mockUseHostIsolationExceptionsAccess.mockReturnValue({
      hasAccessToHostIsolationExceptions: false,
      isHostIsolationExceptionsAccessLoading: false,
    });
    renderResult = renderArtifactsAtPath(HOST_ISOLATION_EXCEPTIONS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('noPrivilegesPage')).toBeInTheDocument();
    });
    expect(
      renderResult.queryByTestId('artifacts-stub-hostIsolationExceptions')
    ).not.toBeInTheDocument();
  });

  it('shows a loading indicator while host isolation exceptions access is resolving', async () => {
    mockUseHostIsolationExceptionsAccess.mockReturnValue({
      hasAccessToHostIsolationExceptions: false,
      isHostIsolationExceptionsAccessLoading: true,
    });
    renderResult = renderArtifactsAtPath(HOST_ISOLATION_EXCEPTIONS_PATH);

    await waitFor(() => {
      expect(renderResult.getByTestId('artifactsPage-hieAccessLoading')).toBeInTheDocument();
    });
    expect(renderResult.queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
  });
});
