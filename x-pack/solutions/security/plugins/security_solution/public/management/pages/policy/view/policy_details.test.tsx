/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AGENT_API_ROUTES, PACKAGE_POLICY_API_ROOT } from '@kbn/fleet-plugin/common';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useLicense as _useLicense } from '../../../../common/hooks/use_license';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import {
  createAppRootMockRenderer,
  resetReactDomCreatePortalMock,
} from '../../../../common/mock/endpoint';
import {
  getEndpointListPath,
  getPoliciesPath,
  getPolicyBlocklistsPath,
  getPolicyCustomYaraSignaturesPath,
  getPolicyDetailPath,
  getPolicyEndpointExceptionsPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
  getPolicyTrustedDevicesPath,
} from '../../../common/routing';
import { policyListApiPathHandlers } from '../store/test_mock_utils';
import { PolicyDetails } from './policy_details';
import { APP_UI_ID } from '../../../../../common/constants';
import { createLicenseServiceMock } from '../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../common/hooks/__mocks__/use_license';
import { useHostIsolationExceptionsAccess } from '../../../hooks/artifacts/use_host_isolation_exceptions_access';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../hooks/artifacts/use_host_isolation_exceptions_access');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useLicenseMock = _useLicense as jest.Mock;
const useHostIsolationExceptionsAccessMock = useHostIsolationExceptionsAccess as jest.Mock;

describe('Policy Details', () => {
  const policyDetailsPathUrl = getPolicyDetailPath('1');
  const policyListPath = getPoliciesPath();
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  let mockedContext: AppContextTestRender;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let setExperimentalFlag: AppContextTestRender['setExperimentalFlag'];
  let http: typeof coreStart.http;
  let render: () => RenderResult;
  let policyPackagePolicy: ReturnType<typeof generator.generatePolicyPackagePolicy>;
  let renderResult: RenderResult;

  beforeAll(() => resetReactDomCreatePortalMock());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    ({ history, coreStart, middlewareSpy, setExperimentalFlag } = mockedContext);
    render = () => {
      renderResult = mockedContext.render(<PolicyDetails />);
      return renderResult;
    };
    http = coreStart.http;
  });

  describe('when displayed with invalid id', () => {
    let releaseApiFailure: () => void;

    beforeEach(() => {
      http.get.mockImplementation(async () => {
        await new Promise((_, reject) => {
          releaseApiFailure = reject.bind(null, new Error('policy not found'));
        });
      });
      act(() => {
        history.push(policyDetailsPathUrl);
      });
      renderResult = render();
    });

    it('should NOT display timeline', () => {
      expect(
        renderResult.queryByTestId('timeline-bottom-bar-title-button')
      ).not.toBeInTheDocument();
    });

    it('should show loader followed by error message', async () => {
      expect(renderResult.getByTestId('policyDetailsLoading')).toBeInTheDocument();

      releaseApiFailure();
      await middlewareSpy.waitForAction('serverFailedToReturnPolicyDetailsData');

      const errorMessage = await renderResult.findByTestId('policyDetailsIdNotFoundMessage');
      expect(errorMessage).toHaveTextContent('policy not found');
      expect(errorMessage.closest('.euiCallOut--danger')).not.toBeNull();
    });
  });

  describe('when displayed with valid id', () => {
    let asyncActions: Promise<unknown> = Promise.resolve();

    beforeEach(() => {
      policyPackagePolicy = generator.generatePolicyPackagePolicy();
      policyPackagePolicy.id = '1';
      policyPackagePolicy.policy_id = policyPackagePolicy.policy_ids[0];

      const policyListApiHandlers = policyListApiPathHandlers();
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: true,
        isHostIsolationExceptionsAccessLoading: false,
      });

      http.get.mockImplementation((...args) => {
        const [path] = args;
        if (typeof path === 'string') {
          // GET datasource
          if (path === `${PACKAGE_POLICY_API_ROOT}/1`) {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyPackagePolicy,
              success: true,
            });
          }

          // GET Agent status for agent policy
          if (path === `${AGENT_API_ROUTES.STATUS_PATTERN}`) {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve({
              results: { events: 0, active: 5, online: 3, error: 1, offline: 1 },
              success: true,
            });
          }

          // Get package data
          // Used in tests that route back to the list
          if (policyListApiHandlers[path]) {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve(policyListApiHandlers[path]());
          }
        }

        return Promise.reject(new Error(`unknown API call (not MOCKED): ${path}`));
      });
      act(() => {
        history.push(policyDetailsPathUrl);
      });
    });

    it('should NOT display tabs when Host Isolation Exceptions access is loading', async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: false,
        isHostIsolationExceptionsAccessLoading: true,
      });
      renderResult = render();
      await asyncActions;

      expect(renderResult.queryByRole('tablist')).not.toBeInTheDocument();
      expect(renderResult.getByTestId('privilegesLoading')).toBeInTheDocument();
    });

    it('should display tabs when Host Isolation Exceptions access is not loading', async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: true,
        isHostIsolationExceptionsAccessLoading: false,
      });
      renderResult = render();
      await asyncActions;

      await waitFor(() => {
        expect(renderResult.getByRole('tablist')).toBeInTheDocument();
      });
      expect(renderResult.queryByTestId('privilegesLoading')).not.toBeInTheDocument();
    });

    it('should NOT display timeline', async () => {
      renderResult = render();
      await asyncActions;
      expect(
        renderResult.queryByTestId('timeline-bottom-bar-title-button')
      ).not.toBeInTheDocument();
    });

    it('should display back to policy list button and policy title', async () => {
      renderResult = render();
      await asyncActions;

      const backButton = await renderResult.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
      expect(backButton).toHaveAttribute('href', `/app/security${policyListPath}`);
      // Destination-only label ("Policies"); the header renders the "Back to " prefix itself.
      expect(backButton).toHaveAccessibleName('Back to Policies');

      const pageTitle = renderResult.getByTestId(APP_HEADER_TEST_SUBJECTS.title);
      expect(pageTitle).toHaveTextContent(policyPackagePolicy.name);
    });

    it('should navigate to list if back to link is clicked', async () => {
      const user = userEvent.setup();
      renderResult = render();
      await asyncActions;

      const backButton = await renderResult.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);

      await user.click(backButton);

      expect(history.location.pathname).toEqual(policyListPath);
    });

    it('should display and navigate to custom back button if non-default backLink state is present', async () => {
      const customBackLinkState = {
        backLink: {
          navigateTo: [
            APP_UI_ID,
            {
              path: getEndpointListPath({ name: 'endpointList' }),
            },
          ],
          label: 'Endpoints',
          href: '/app/security/administration/endpoints',
        },
      };

      act(() => {
        history.push({ pathname: policyDetailsPathUrl, state: customBackLinkState });
      });
      renderResult = render();
      await asyncActions;

      const backButton = await renderResult.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
      expect(backButton).toHaveAttribute('href', '/app/security/administration/endpoints');
      expect(backButton).toHaveAccessibleName('Back to Endpoints');
    });

    it('should display agent stats as three health metadata items, with no "Total agents" item', async () => {
      renderResult = render();
      await asyncActions;

      await waitFor(() => {
        expect(renderResult.getByTestId('policyAgentsSummary-healthy')).toHaveTextContent(
          'Healthy: 3'
        );
      });
      expect(renderResult.getByTestId('policyAgentsSummary-unhealthy')).toHaveTextContent(
        'Unhealthy: 1'
      );
      expect(renderResult.getByTestId('policyAgentsSummary-offline')).toHaveTextContent(
        'Offline: 1'
      );
      expect(renderResult.queryByTestId('policyAgentsSummary')).not.toBeInTheDocument();
      expect(renderResult.queryByText(/Total agents/)).not.toBeInTheDocument();
    });

    it('should display event filters tab', async () => {
      renderResult = render();
      await asyncActions;

      const eventFiltersTab = await renderResult.findByTestId('policyEventFiltersTab');
      expect(eventFiltersTab).toHaveTextContent('Event filters');
    });

    it('should display the host isolation exceptions tab if user have access', async () => {
      renderResult = render();
      await asyncActions;

      expect(
        await renderResult.findByTestId('policyHostIsolationExceptionsTab')
      ).toBeInTheDocument();
    });

    it("shouldn't display the host isolation exceptions tab when user doesn't have access", async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: false,
        isHostIsolationExceptionsAccessLoading: false,
      });
      renderResult = render();
      await asyncActions;

      await waitFor(() => {
        expect(renderResult.getByRole('tablist')).toBeInTheDocument();
      });
      expect(
        renderResult.queryByTestId('policyHostIsolationExceptionsTab')
      ).not.toBeInTheDocument();
    });

    it('should display the protection updates tab', async () => {
      renderResult = render();
      await asyncActions;

      const tab = await renderResult.findByTestId('policyProtectionUpdatesTab');
      expect(tab).toHaveTextContent('Protection updates');
    });

    describe('trusted devices tab', () => {
      const renderWithTrustedDevicesPrivilege = async (canReadTrustedDevices: boolean) => {
        setExperimentalFlag({ trustedDevices: true });
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: {
            loading: false,
            canReadTrustedDevices,
          },
        });
        renderResult = render();
        await asyncActions;
        await waitFor(() => {
          expect(renderResult.getByRole('tablist')).toBeInTheDocument();
        });
      };

      afterEach(() => {
        useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
      });

      it('should not display the trusted devices tab with no privileges', async () => {
        await renderWithTrustedDevicesPrivilege(false);
        expect(renderResult.queryByTestId('policyTrustedDevicesTab')).not.toBeInTheDocument();
      });

      it('should display the trusted devices tab with the correct privilege', async () => {
        await renderWithTrustedDevicesPrivilege(true);
        expect(renderResult.getByTestId('policyTrustedDevicesTab')).toBeInTheDocument();
      });

      it('should redirect to policy details when no trusted devices required privilege', async () => {
        act(() => {
          history.push(getPolicyTrustedDevicesPath('1'));
        });
        await renderWithTrustedDevicesPrivilege(false);
        expect(history.location.pathname).toBe(policyDetailsPathUrl);
        expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
          'You do not have the required Kibana permissions to use the given artifact.'
        );
      });

      it('should not display trusted devices without the feature flag enabled', async () => {
        setExperimentalFlag({ trustedDevices: false });
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: {
            loading: false,
            canReadTrustedDevices: true,
          },
        });
        renderResult = render();
        await asyncActions;
        await waitFor(() => {
          expect(renderResult.getByRole('tablist')).toBeInTheDocument();
        });
        expect(renderResult.queryByTestId('policyTrustedDevicesTab')).not.toBeInTheDocument();
      });
    });

    describe('custom YARA signatures tab', () => {
      const renderWithCustomYaraPrivilege = async (canReadCustomYaraSignatures: boolean) => {
        setExperimentalFlag({ customYaraSignaturesEnabled: true });
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: {
            loading: false,
            canReadCustomYaraSignatures,
          },
        });
        renderResult = render();
        await asyncActions;
        await waitFor(() => {
          expect(renderResult.getByRole('tablist')).toBeInTheDocument();
        });
      };

      afterEach(() => {
        setExperimentalFlag({ customYaraSignaturesEnabled: false });
        useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
      });

      it('should not display the custom YARA signatures tab with no privileges', async () => {
        await renderWithCustomYaraPrivilege(false);
        expect(renderResult.queryByTestId('policyCustomYaraSignaturesTab')).not.toBeInTheDocument();
      });

      it('should display the custom YARA signatures tab with the correct privilege', async () => {
        await renderWithCustomYaraPrivilege(true);
        expect(renderResult.getByTestId('policyCustomYaraSignaturesTab')).toHaveTextContent(
          'Custom YARA signatures'
        );
      });

      it('should redirect to policy details when no custom YARA signatures required privilege', async () => {
        act(() => {
          history.push(getPolicyCustomYaraSignaturesPath('1'));
        });
        await renderWithCustomYaraPrivilege(false);
        expect(history.location.pathname).toBe(policyDetailsPathUrl);
        expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
          'You do not have the required Kibana permissions to use the given artifact.'
        );
      });

      it('should not display custom YARA signatures without the feature flag enabled', async () => {
        setExperimentalFlag({ customYaraSignaturesEnabled: false });
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: {
            loading: false,
            canReadCustomYaraSignatures: true,
          },
        });
        renderResult = render();
        await asyncActions;
        await waitFor(() => {
          expect(renderResult.getByRole('tablist')).toBeInTheDocument();
        });
        expect(renderResult.queryByTestId('policyCustomYaraSignaturesTab')).not.toBeInTheDocument();
      });
    });

    describe('without enterprise license', () => {
      beforeEach(() => {
        const licenseServiceMock = createLicenseServiceMock();
        licenseServiceMock.isEnterprise.mockReturnValue(false);

        useLicenseMock.mockReturnValue(licenseServiceMock);
        useHostIsolationExceptionsAccessMock.mockReturnValue({
          hasAccessToHostIsolationExceptions: false,
          isHostIsolationExceptionsAccessLoading: false,
        });
      });

      afterEach(() => {
        useLicenseMock.mockReturnValue(licenseServiceMocked);
      });

      it('should not display the protection updates tab', async () => {
        renderResult = render();
        await asyncActions;
        await waitFor(() => {
          expect(renderResult.getByRole('tablist')).toBeInTheDocument();
        });
        expect(renderResult.queryByTestId('policyProtectionUpdatesTab')).not.toBeInTheDocument();
      });

      describe('without required permissions', () => {
        const renderWithPrivilege = async (privilege: string, value: boolean) => {
          useUserPrivilegesMock.mockReturnValue({
            endpointPrivileges: {
              loading: false,
              [privilege]: value,
            },
          });
          renderResult = render();
          await asyncActions;
          await waitFor(() => {
            expect(renderResult.getByRole('tablist')).toBeInTheDocument();
          });
        };

        it.each([
          ['trusted apps', 'canReadTrustedApplications', 'policyTrustedAppsTab'],
          ['event filters', 'canReadEventFilters', 'policyEventFiltersTab'],
          [
            'host isolation exeptions',
            'canReadHostIsolationExceptions',
            'policyHostIsolationExceptionsTab',
          ],
          ['blocklist', 'canReadBlocklist', 'policyBlocklistTab'],
          ['endpoint exceptions', 'canReadEndpointExceptions', 'policyEndpointExceptionsTab'],
        ])(
          'should not display the %s tab with no privileges',
          async (_: string, privilege: string, dataTestSubj: string) => {
            setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });

            await renderWithPrivilege(privilege, false);
            expect(renderResult.queryByTestId(dataTestSubj)).not.toBeInTheDocument();
          }
        );

        it.each([
          ['trusted apps', 'canReadTrustedApplications', 'policyTrustedAppsTab'],
          ['event filters', 'canReadEventFilters', 'policyEventFiltersTab'],
          ['blocklist', 'canReadBlocklist', 'policyBlocklistTab'],
          ['endpoint exceptions', 'canReadEndpointExceptions', 'policyEndpointExceptionsTab'],
        ])(
          'should display the %s tab with the correct privilege',
          async (_: string, privilege: string, dataTestSubj: string) => {
            setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });

            await renderWithPrivilege(privilege, true);
            expect(renderResult.getByTestId(dataTestSubj)).toBeInTheDocument();
          }
        );

        it('should not display endpoint exceptions without the feature flag enabled', async () => {
          setExperimentalFlag({ endpointExceptionsMovedUnderManagement: false });

          await renderWithPrivilege('canReadEndpointExceptions', true);
          expect(renderResult.queryByTestId('policyEndpointExceptionsTab')).not.toBeInTheDocument();
        });

        it.each([
          ['trusted apps', 'canReadTrustedApplications', getPolicyTrustedAppsPath('1')],
          ['event filters', 'canReadEventFilters', getPolicyEventFiltersPath('1')],
          [
            'host isolation exeptions',
            'canReadHostIsolationExceptions',
            getPolicyHostIsolationExceptionsPath('1'),
          ],
          ['blocklist', 'canReadBlocklist', getPolicyBlocklistsPath('1')],
          [
            'endpoint exceptions',
            'canReadEndpointExceptions',
            getPolicyEndpointExceptionsPath('1'),
          ],
        ])(
          'should redirect to policy details when no %s required privileges',
          async (_: string, privilege: string, path: string) => {
            setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });

            act(() => {
              history.push(path);
            });
            await renderWithPrivilege(privilege, false);
            expect(history.location.pathname).toBe(policyDetailsPathUrl);
            expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
            expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
              'You do not have the required Kibana permissions to use the given artifact.'
            );
          }
        );
      });
    });
  });
});
