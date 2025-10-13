/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ComponentType as EnzymeComponentType, mount } from 'enzyme';
import React from 'react';
import { AGENT_API_ROUTES, PACKAGE_POLICY_API_ROOT } from '@kbn/fleet-plugin/common';
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
  getPolicyDetailPath,
  getPolicyEndpointExceptionsPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
} from '../../../common/routing';
import { policyListApiPathHandlers } from '../store/test_mock_utils';
import { PolicyDetails } from './policy_details';
import { APP_UI_ID } from '../../../../../common/constants';
import { createLicenseServiceMock } from '../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../common/hooks/__mocks__/use_license';
import { useHostIsolationExceptionsAccess } from '../../../hooks/artifacts/use_host_isolation_exceptions_access';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../common';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../hooks/artifacts/use_host_isolation_exceptions_access');
jest.mock('../../../../common/experimental_features_service');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useLicenseMock = _useLicense as jest.Mock;
const useHostIsolationExceptionsAccessMock = useHostIsolationExceptionsAccess as jest.Mock;

describe('Policy Details', () => {
  const policyDetailsPathUrl = getPolicyDetailPath('1');
  const policyListPath = getPoliciesPath();
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let http: typeof coreStart.http;
  let render: () => ReturnType<typeof mount>;
  let policyPackagePolicy: ReturnType<typeof generator.generatePolicyPackagePolicy>;
  let policyView: ReturnType<typeof render>;

  beforeAll(() => resetReactDomCreatePortalMock());

  beforeEach(() => {
    const appContextMockRenderer = createAppRootMockRenderer();
    const AppWrapper = appContextMockRenderer.AppWrapper;

    ({ history, coreStart, middlewareSpy } = appContextMockRenderer);
    render = () =>
      mount(<PolicyDetails />, { wrappingComponent: AppWrapper as EnzymeComponentType<{}> });
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
      history.push(policyDetailsPathUrl);
      policyView = render();
    });

    it('should NOT display timeline', async () => {
      expect(policyView.find('timeline-bottom-bar-title-button')).toHaveLength(0);
    });

    it('should show loader followed by error message', async () => {
      expect(policyView.find('EuiLoadingSpinner').length).toBe(1);
      releaseApiFailure();
      await middlewareSpy.waitForAction('serverFailedToReturnPolicyDetailsData');
      policyView.update();
      const callout = policyView.find('EuiCallOut');
      expect(callout).toHaveLength(1);
      expect(callout.prop('color')).toEqual('danger');
      expect(callout.text()).toEqual('policy not found');
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
      history.push(policyDetailsPathUrl);
    });

    it('should NOT display tabs when Host Isolation Exceptions access is loading', async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: false,
        isHostIsolationExceptionsAccessLoading: true,
      });
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('[data-test-subj="policyTabs"]');
      expect(tab).toHaveLength(0);
      const loader = policyView.find('span[data-test-subj="privilegesLoading"]');
      expect(loader).toHaveLength(1);
    });

    it('should display tabs when Host Isolation Exceptions access is not loading', async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: true,
        isHostIsolationExceptionsAccessLoading: false,
      });
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('div[data-test-subj="policyTabs"]');
      expect(tab).toHaveLength(1);
      const loader = policyView.find('div[data-test-subj="privilegesLoading"]');
      expect(loader).toHaveLength(0);
    });

    it('should NOT display timeline', async () => {
      policyView = render();
      await asyncActions;
      expect(policyView.find('timeline-bottom-bar-title-button')).toHaveLength(0);
    });

    it('should display back to policy list button and policy title', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('BackToExternalAppButton');
      expect(backToListLink.prop('backButtonUrl')).toBe(`/app/security${policyListPath}`);
      expect(backToListLink.text()).toBe('Back to policy list');

      const pageTitle = policyView.find('span[data-test-subj="header-page-title"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyPackagePolicy.name);
    });

    it('should navigate to list if back to link is clicked', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('a[data-test-subj="policyDetailsBackLink"]');
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      backToListLink.simulate('click', { button: 0 });
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
          label: 'View all endpoints',
          href: '/app/security/administration/endpoints',
        },
      };

      history.push({ pathname: policyDetailsPathUrl, state: customBackLinkState });
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('BackToExternalAppButton');
      expect(backToListLink.prop('backButtonUrl')).toBe(`/app/security/administration/endpoints`);
      expect(backToListLink.text()).toBe('View all endpoints');
    });

    it('should display agent stats', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const agentsSummary = policyView.find('EuiFlexGroup[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary).toHaveLength(1);
      expect(agentsSummary.text()).toBe('Total agents5Healthy3Unhealthy1Offline1');
    });

    it('should display event filters tab', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const eventFiltersTab = policyView.find('button#eventFilters');
      expect(eventFiltersTab).toHaveLength(1);
      expect(eventFiltersTab.text()).toBe('Event filters');
    });

    it('should display the host isolation exceptions tab if user have access', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('button[data-test-subj="policyHostIsolationExceptionsTab"]');
      expect(tab).toHaveLength(1);
    });

    it("shouldn't display the host isolation exceptions tab when user doesn't have access", async () => {
      useHostIsolationExceptionsAccessMock.mockReturnValue({
        hasAccessToHostIsolationExceptions: false,
        isHostIsolationExceptionsAccessLoading: false,
      });
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('button[data-test-subj="policyHostIsolationExceptionsTab"]');
      expect(tab).toHaveLength(0);
    });

    it('should display the protection updates tab', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('button#protectionUpdates');
      expect(tab).toHaveLength(1);
      expect(tab.text()).toBe('Protection updates');
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
        policyView = render();
        await asyncActions;
        policyView.update();
        const tab = policyView.find('button#protectionUpdates');
        expect(tab).toHaveLength(0);
      });

      describe('without required permissions', () => {
        const renderWithPrivilege = async (privilege: string, value: boolean) => {
          useUserPrivilegesMock.mockReturnValue({
            endpointPrivileges: {
              loading: false,
              [privilege]: value,
            },
          });
          policyView = render();
          await asyncActions;
          policyView.update();
        };

        it.each([
          ['trusted apps', 'canReadTrustedApplications', 'trustedApps'],
          ['event filters', 'canReadEventFilters', 'eventFilters'],
          ['host isolation exeptions', 'canReadHostIsolationExceptions', 'hostIsolationExceptions'],
          ['blocklist', 'canReadBlocklist', 'blocklists'],
          ['endpoint exceptions', 'canReadEndpointExceptions', 'endpointExceptions'],
        ])(
          'should not display the %s tab with no privileges',
          async (_: string, privilege: string, selector: string) => {
            (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
              ...allowedExperimentalValues,
              endpointExceptionsMovedUnderManagement: true,
            });

            await renderWithPrivilege(privilege, false);
            expect(policyView.find(`button#${selector}`)).toHaveLength(0);
          }
        );

        it.each([
          ['trusted apps', 'canReadTrustedApplications', 'trustedApps'],
          ['event filters', 'canReadEventFilters', 'eventFilters'],
          ['blocklist', 'canReadBlocklist', 'blocklists'],
          ['endpoint exceptions', 'canReadEndpointExceptions', 'endpointExceptions'],
        ])(
          'should display the %s tab with  the correct privilege',
          async (_: string, privilege: string, selector: string) => {
            (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
              ...allowedExperimentalValues,
              endpointExceptionsMovedUnderManagement: true,
            });

            await renderWithPrivilege(privilege, true);
            expect(policyView.find(`button#${selector}`)).toHaveLength(1);
          }
        );

        it('should not display endpoint exceptions without the feature flag enabled', async () => {
          (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue(allowedExperimentalValues);

          await renderWithPrivilege('canReadEndpointExceptions', true);
          expect(policyView.find('button#endpointExceptions')).toHaveLength(0);
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
            (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
              ...allowedExperimentalValues,
              endpointExceptionsMovedUnderManagement: true,
            });

            history.push(path);
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
