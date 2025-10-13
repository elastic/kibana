/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointList } from '.';
import { createUseUiSetting$Mock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { DeepPartial } from '@kbn/utility-types';

import {
  mockEndpointDetailsApiResult,
  mockEndpointResultList,
  setEndpointListApiMockImplementation,
} from '../store/mock_endpoint_result_list';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import type { HostInfo, HostPolicyResponse } from '../../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus, HostStatus } from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { mockPolicyResultList } from '../../policy/store/test_mock_utils';
import { getEndpointDetailsPath } from '../../../common/routing';
import { KibanaServices, useKibana, useToasts, useUiSetting$ } from '../../../../common/lib/kibana';
import { hostIsolationHttpMocks } from '../../../../common/lib/endpoint/endpoint_isolation/mocks';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isUninitialisedResourceState,
} from '../../../state';
import { getCurrentIsolationRequestState } from '../store/selectors';
import { licenseService } from '../../../../common/hooks/use_license';

import {
  APP_PATH,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
  MANAGEMENT_PATH,
  TRANSFORM_STATES,
} from '../../../../../common/constants';
import type { TransformStats } from '../types';
import {
  HOST_METADATA_LIST_ROUTE,
  METADATA_UNITED_TRANSFORM,
  metadataTransformPrefix,
} from '../../../../../common/endpoint/constants';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  initialUserPrivilegesState,
  initialUserPrivilegesState as mockInitialUserPrivilegesState,
} from '../../../../common/components/user_privileges/user_privileges_context';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { ENDPOINT_CAPABILITIES } from '../../../../../common/endpoint/service/response_actions/constants';
import { getEndpointPrivilegesInitialStateMock } from '../../../../common/components/user_privileges/endpoint/mocks';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { useGetAgentStatus as _useGetAgentStatus } from '../../../hooks/agents/use_get_agent_status';
import { agentStatusMocks } from '../../../../../common/endpoint/service/response_actions/mocks/agent_status.mocks';
import { useBulkGetAgentPolicies } from '../../../services/policies/hooks';
import type { PartialEndpointPolicyData } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../common';

jest.mock('../../../../common/experimental_features_service');

const mockUserPrivileges = useUserPrivileges as jest.Mock;
// not sure why this can't be imported from '../../../../common/mock/formatted_relative';
// but sure enough, it needs to be inline in this one file
jest.mock('@kbn/i18n-react', () => {
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en' });
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/components/link_to');
jest.mock('../../../services/policies/ingest', () => {
  const originalModule = jest.requireActual('../../../services/policies/ingest');
  return {
    ...originalModule,
    sendGetEndpointSecurityPackage: () => Promise.resolve({}),
  };
});

jest.mock('../../../hooks/agents/use_get_agent_status');
const useGetAgentStatusMock = _useGetAgentStatus as jest.Mock;

jest.mock('../../../services/policies/hooks', () => ({
  ...jest.requireActual('../../../services/policies/hooks'),
  useBulkGetAgentPolicies: jest.fn().mockReturnValue({}),
}));
jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: jest.fn().mockReturnValue({
      data: { data: [], total: 0, page: 1, perPage: 10 },
      isLoading: false,
      refetch: jest.fn(),
    }),
  })
);
const useBulkGetAgentPoliciesMock = useBulkGetAgentPolicies as unknown as jest.Mock<
  DeepPartial<ReturnType<typeof useBulkGetAgentPolicies>>
>;

const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const timepickerRanges = [
  {
    from: 'now/d',
    to: 'now/d',
    display: 'Today',
  },
  {
    from: 'now/w',
    to: 'now/w',
    display: 'This week',
  },
  {
    from: 'now-15m',
    to: 'now',
    display: 'Last 15 minutes',
  },
  {
    from: 'now-30m',
    to: 'now',
    display: 'Last 30 minutes',
  },
  {
    from: 'now-1h',
    to: 'now',
    display: 'Last 1 hour',
  },
  {
    from: 'now-24h',
    to: 'now',
    display: 'Last 24 hours',
  },
  {
    from: 'now-7d',
    to: 'now',
    display: 'Last 7 days',
  },
  {
    from: 'now-30d',
    to: 'now',
    display: 'Last 30 days',
  },
  {
    from: 'now-90d',
    to: 'now',
    display: 'Last 90 days',
  },
  {
    from: 'now-1y',
    to: 'now',
    display: 'Last 1 year',
  },
];

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../hooks/endpoint/use_get_endpoint_details');
const mockUseGetEndpointDetails = useGetEndpointDetails as jest.Mock;

describe('when on the endpoint list page', () => {
  const docGenerator = new EndpointDocGenerator();
  const { act, screen, fireEvent } = reactTestingLibrary;

  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: reactTestingLibrary.RenderResult;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let abortSpy: jest.SpyInstance;

  (licenseService as jest.Mocked<typeof licenseService>).isPlatinumPlus.mockReturnValue(true);

  beforeAll(() => {
    const mockAbort = new AbortController();
    mockAbort.abort();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbort);
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart, middlewareSpy } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EndpointList />));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/endpoints`);
    });

    // Because `.../common/lib/kibana` was mocked, we need to alter these hooks (which are jest.MockFunctions)
    // to use services that we have in our test `mockedContext`
    (useToasts as jest.Mock).mockReturnValue(coreStart.notifications.toasts);
    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      siem: { readPolicyManagement: true },
    };
  });

  it('should NOT display timeline', async () => {
    setEndpointListApiMockImplementation(coreStart.http, {
      endpointsResults: [],
    });

    render();
    const timelineFlyout = renderResult.queryByTestId('timeline-bottom-bar-title-button');
    expect(timelineFlyout).not.toBeInTheDocument();
  });

  describe('when there are no endpoints or polices', () => {
    beforeEach(() => {
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
      });
    });

    it('should show the empty state when there are no hosts or polices', async () => {
      render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      // Initially, there are no hosts or policies, so we prompt to add policies first.
      const table = await renderResult.findByTestId('emptyPolicyTable');
      expect(table).toBeInTheDocument();
    });
  });

  describe('when there are policies, but no hosts', () => {
    const getOptionsTexts = async () => {
      const onboardingPolicySelect = await renderResult.findByTestId('onboardingPolicySelect');
      const options = onboardingPolicySelect.querySelectorAll('[role=option]');

      return [...options].map(({ textContent }) => textContent);
    };

    const setupPolicyDataMocks = (
      partialPolicyData: PartialEndpointPolicyData[] = [
        { name: 'Package 1', policy_ids: ['policy-1'] },
      ]
    ) => {
      const policyData = partialPolicyData.map((overrides) =>
        docGenerator.generatePolicyPackagePolicy({ overrides })
      );

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
        endpointPackagePolicies: policyData,
      });
    };

    beforeEach(async () => {
      useBulkGetAgentPoliciesMock.mockReturnValue({
        data: [
          { id: 'policy-1', name: 'Agent Policy 1' },
          { id: 'policy-2', name: 'Agent Policy 2' },
          { id: 'policy-3', name: 'Agent Policy 3' },
        ],
        isLoading: false,
      });

      setupPolicyDataMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should show loading spinner while Agent Policies are loading', async () => {
      useBulkGetAgentPoliciesMock.mockReturnValue({ isLoading: true });
      render();
      expect(
        await renderResult.findByTestId('management-empty-state-loading-spinner')
      ).toBeInTheDocument();
    });

    it('should show the no hosts empty state without loading spinner', async () => {
      render();

      expect(
        renderResult.queryByTestId('management-empty-state-loading-spinner')
      ).not.toBeInTheDocument();

      const emptyHostsTable = await renderResult.findByTestId('emptyHostsTable');
      expect(emptyHostsTable).toBeInTheDocument();
    });

    it('should display the onboarding steps', async () => {
      render();
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).toBeInTheDocument();
    });

    describe('policy selection', () => {
      it('should show policy selection', async () => {
        render();
        const onboardingPolicySelect = await renderResult.findByTestId('onboardingPolicySelect');
        expect(onboardingPolicySelect).toBeInTheDocument();
      });

      it('should show discrete `package policy - agent policy` pairs', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: ['policy-1'] },
          { name: 'Package 2', policy_ids: ['policy-2'] },
        ]);

        render();
        const optionsTexts = await getOptionsTexts();

        expect(optionsTexts).toStrictEqual([
          'Package 1 - Agent Policy 1',
          'Package 2 - Agent Policy 2',
        ]);
      });

      it('should display the same package policy with multiple Agent Policies multiple times', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: ['policy-1', 'policy-2', 'policy-3'] },
        ]);

        render();
        const optionsTexts = await getOptionsTexts();

        expect(optionsTexts).toStrictEqual([
          'Package 1 - Agent Policy 1',
          'Package 1 - Agent Policy 2',
          'Package 1 - Agent Policy 3',
        ]);
      });

      it('should not display a package policy without agent policy', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: [] },
          { name: 'Package 2', policy_ids: ['policy-1'] },
        ]);

        render();
        const optionsTexts = await getOptionsTexts();

        expect(optionsTexts).toStrictEqual(['Package 2 - Agent Policy 1']);
      });

      it("should fallback to agent policy ID if it's not found", async () => {
        setupPolicyDataMocks([{ name: 'Package 1', policy_ids: ['agent-policy-id'] }]);

        render();
        const optionsTexts = await getOptionsTexts();
        expect(
          renderResult.queryByTestId('noIntegrationsAddedToAgentPoliciesCallout')
        ).not.toBeInTheDocument();

        expect(optionsTexts).toStrictEqual(['Package 1 - agent-policy-id']);
      });

      it('should show callout indicating that none of the integrations are added to agent policies', async () => {
        setupPolicyDataMocks([{ name: 'Package 1', policy_ids: [] }]);

        render();

        expect(
          await renderResult.findByTestId('noIntegrationsAddedToAgentPoliciesCallout')
        ).toBeInTheDocument();
      });
    });

    describe('integration not added to agent policy callout', () => {
      it('should not display callout if all integrations are added to agent policies', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: ['policy-1'] },
          { name: 'Package 2', policy_ids: ['policy-2'] },
        ]);

        render();
        await getOptionsTexts();

        expect(
          renderResult.queryByTestId('integrationsNotAddedToAgentPolicyCallout')
        ).not.toBeInTheDocument();
      });

      it('should display callout if an integration is not added to an agent policy', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: ['policy-1'] },
          { name: 'Package 2', policy_ids: [] },
        ]);

        render();

        expect(
          await renderResult.findByTestId('integrationsNotAddedToAgentPolicyCallout')
        ).toBeInTheDocument();
      });

      it('should list all integrations which are not added to an agent policy', async () => {
        setupPolicyDataMocks([
          { name: 'Package 1', policy_ids: ['policy-1'] },
          { name: 'Package 2', policy_ids: [] },
          { name: 'Package 3', policy_ids: [] },
          { name: 'Package 4', policy_ids: [] },
        ]);

        render();

        const integrations = await renderResult.findAllByTestId(
          'integrationWithoutAgentPolicyListItem'
        );
        expect(integrations.map(({ textContent }) => textContent)).toStrictEqual([
          'Package 2',
          'Package 3',
          'Package 4',
        ]);
      });
    });
  });

  describe('when there is no selected host in the url', () => {
    describe('when list data loads', () => {
      const generatedPolicyStatuses: Array<
        HostInfo['metadata']['Endpoint']['policy']['applied']['status']
      > = [];
      let firstPolicyID: string;
      let firstPolicyRev: number;

      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const mockedEndpointData = mockEndpointResultList({ total: 5 });
          const hostListData = mockedEndpointData.data;

          firstPolicyID = hostListData[0].metadata.Endpoint.policy.applied.id;
          firstPolicyRev = hostListData[0].metadata.Endpoint.policy.applied.endpoint_policy_version;

          // add ability to change (immutable) policy
          type DeepMutable<T> = { -readonly [P in keyof T]: DeepMutable<T[P]> };
          type Policy = DeepMutable<NonNullable<HostInfo['policy_info']>>;

          const makePolicy = (
            applied: HostInfo['metadata']['Endpoint']['policy']['applied'],
            cb: (policy: Policy) => Policy
          ): Policy => {
            return cb({
              agent: {
                applied: { id: 'xyz', revision: applied.version },
                configured: { id: 'xyz', revision: applied.version },
              },
              endpoint: { id: applied.id, revision: applied.endpoint_policy_version },
            });
          };

          [
            { status: HostStatus.UNHEALTHY, policy: (p: Policy) => p },
            {
              status: HostStatus.HEALTHY,
              policy: (p: Policy) => {
                p.endpoint.id = 'xyz'; // represents change in endpoint policy assignment
                p.endpoint.revision = 1;
                return p;
              },
            },
            {
              status: HostStatus.OFFLINE,
              policy: (p: Policy) => {
                p.endpoint.revision += 1; // changes made to endpoint policy
                return p;
              },
            },
            {
              status: HostStatus.UPDATING,
              policy: (p: Policy) => {
                p.agent.configured.revision += 1; // agent policy change, not propagated to agent yet
                return p;
              },
            },
            {
              status: HostStatus.INACTIVE,
              policy: (p: Policy) => {
                p.agent.configured.revision += 1; // agent policy change, not propagated to agent yet
                return p;
              },
            },
          ].forEach((setup, index) => {
            hostListData[index] = {
              metadata: hostListData[index].metadata,
              host_status: setup.status,
              policy_info: makePolicy(
                hostListData[index].metadata.Endpoint.policy.applied,
                setup.policy
              ),
              last_checkin: hostListData[index].last_checkin,
            };
          });
          hostListData.forEach((item, index) => {
            generatedPolicyStatuses[index] = item.metadata.Endpoint.policy.applied.status;
          });

          // Make sure that the first policy id in the host result is not set as non-existent
          const ingestPackagePolicies = mockPolicyResultList({ total: 1 }).items;
          ingestPackagePolicies[0].id = firstPolicyID;

          setEndpointListApiMockImplementation(coreStart.http, {
            endpointsResults: hostListData,
            endpointPackagePolicies: ingestPackagePolicies,
          });

          useGetAgentStatusMock.mockImplementation((agentId, agentType) => {
            return {
              data: {
                [agentId]: agentStatusMocks.generateAgentStatus({
                  agentType,
                }),
              },
              isLoading: false,
              isFetched: true,
            };
          });
        });
      });
      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should display rows in the table', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const rows = await renderResult.findAllByRole('row');
        expect(rows).toHaveLength(6);
      });
      it('should show total', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const total = await renderResult.findByTestId('endpointListTableTotal');
        expect(total.textContent).toEqual('Showing 5 endpoints');
      });
      it('should agent status', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });

        const hostStatuses = await renderResult.findAllByTestId('rowHostStatus');

        expect(hostStatuses[0].textContent).toEqual('Healthy');
        expect(hostStatuses[1].textContent).toEqual('Healthy');
        expect(hostStatuses[2].textContent).toEqual('Healthy');
        expect(hostStatuses[3].textContent).toEqual('Healthy');
        expect(hostStatuses[4].textContent).toEqual('Healthy');
      });

      it('should display correct policy status', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const policyStatuses = await renderResult.findAllByTestId('rowPolicyStatus');

        policyStatuses.forEach((status, index) => {
          expect(status.textContent).toEqual(POLICY_STATUS_TO_TEXT[generatedPolicyStatuses[index]]);
          expect(
            status.querySelector(
              `[data-euiicon-type][color=${
                POLICY_STATUS_TO_HEALTH_COLOR[generatedPolicyStatuses[index]]
              }]`
            )
          ).toBeInTheDocument();
        });
      });

      it('should display policy out-of-date warning when changes pending', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const outOfDates = await renderResult.findAllByTestId('policyNameCellLink-outdatedMsg');
        expect(outOfDates).toHaveLength(4);

        outOfDates.forEach((item) => {
          expect(item.textContent).toEqual('Out-of-date');
        });
      });

      it('should display policy name as a link', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const firstPolicyName = (await renderResult.findAllByTestId('policyNameCellLink-link'))[0];
        expect(firstPolicyName).toBeInTheDocument();
        expect(firstPolicyName.getAttribute('href')).toEqual(
          `${APP_PATH}${MANAGEMENT_PATH}/policy/${firstPolicyID}/settings`
        );
      });

      describe('when the user clicks the first hostname in the table', () => {
        const endpointDetails: HostInfo = mockEndpointDetailsApiResult();
        beforeEach(async () => {
          mockUseGetEndpointDetails.mockReturnValue({
            data: {
              ...endpointDetails,
              host_status: endpointDetails.host_status,
              metadata: {
                ...endpointDetails.metadata,
                Endpoint: {
                  ...endpointDetails.metadata.Endpoint,
                  state: {
                    ...endpointDetails.metadata.Endpoint.state,
                    isolation: false,
                  },
                },
                agent: {
                  ...endpointDetails.metadata.agent,
                  id: '1',
                },
              },
            },
          });
          render();
          await reactTestingLibrary.act(async () => {
            await middlewareSpy.waitForAction('serverReturnedEndpointList');
          });
          const hostNameLinks = await renderResult.findAllByTestId('hostnameCellLink');
          if (hostNameLinks.length) {
            reactTestingLibrary.fireEvent.click(hostNameLinks[0]);
          }
        });

        it('should show the flyout', async () => {
          return renderResult.findByTestId('endpointDetailsFlyout').then((flyout) => {
            expect(flyout).toBeInTheDocument();
          });
        });
      });

      it('should show revision number', async () => {
        render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const firstPolicyRevElement = (
          await renderResult.findAllByTestId('policyNameCellLink-revision')
        )[0];
        expect(firstPolicyRevElement).toBeInTheDocument();
        expect(firstPolicyRevElement.textContent).toEqual(`rev. ${firstPolicyRev}`);
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/75721
  describe.skip('when polling on Endpoint List', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        const hostListData = mockEndpointResultList({ total: 4 }).data;

        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: hostListData,
        });

        const pollInterval = 10;
        store.dispatch({
          type: 'userUpdatedEndpointListRefreshOptions',
          payload: {
            autoRefreshInterval: pollInterval,
          },
        });
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update data after some time', async () => {
      render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
      });
      const total = await renderResult.findAllByTestId('endpointListTableTotal');
      expect(total[0].textContent).toEqual('4 Hosts');

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: mockEndpointResultList({ total: 1 }).data,
      });

      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('appRequestedEndpointList');
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
      });

      render();

      const updatedTotal = await renderResult.findAllByTestId('endpointListTableTotal');
      expect(updatedTotal[0].textContent).toEqual('1 Host');
    });
  });

  describe('when there is a selected host in the url', () => {
    let hostInfo: HostInfo;
    const endpointDetails: HostInfo = mockEndpointDetailsApiResult();
    const mockEndpointListApi = (mockedPolicyResponse?: HostPolicyResponse) => {
      const {
        host_status: hostStatus,
        last_checkin: lastCheckin,
        metadata: { agent, Endpoint, ...details },
      } = endpointDetails;

      hostInfo = {
        host_status: hostStatus,
        metadata: {
          ...details,
          Endpoint: {
            ...Endpoint,
            state: {
              ...Endpoint.state,
              isolation: false,
            },
          },
          agent: {
            ...agent,
            id: '1',
          },
        },
        last_checkin: lastCheckin,
      };

      const policy = docGenerator.generatePolicyPackagePolicy();
      policy.id = hostInfo.metadata.Endpoint.policy.applied.id;

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [hostInfo],
        endpointPackagePolicies: [policy],
        policyResponse: mockedPolicyResponse,
      });
    };

    const getMockUseEndpointDetails = (policyStatus?: HostPolicyResponseActionStatus) => {
      return mockUseGetEndpointDetails.mockReturnValue({
        data: {
          ...hostInfo,
          metadata: {
            ...hostInfo.metadata,
            Endpoint: {
              ...hostInfo.metadata.Endpoint,
              policy: {
                ...hostInfo.metadata.Endpoint.policy,
                applied: {
                  ...hostInfo.metadata.Endpoint.policy.applied,
                  status: policyStatus,
                },
              },
            },
          },
        },
      });
    };

    beforeEach(async () => {
      mockEndpointListApi();
      getMockUseEndpointDetails();
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1`);
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });

    it('should show the flyout and footer', async () => {
      render();
      expect(renderResult.getByTestId('endpointDetailsFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('endpointDetailsFlyoutFooter')).toBeInTheDocument();
    });

    it('should display policy name value as a link', async () => {
      render();
      const policyDetailsLink = await renderResult.findByTestId('policyNameCellLink-link');
      expect(policyDetailsLink).toBeInTheDocument();
      expect(policyDetailsLink.getAttribute('href')).toEqual(
        `${APP_PATH}${MANAGEMENT_PATH}/policy/${hostInfo.metadata.Endpoint.policy.applied.id}/settings`
      );
    });

    it('should display policy revision number', async () => {
      render();
      const policyDetailsRevElement = await renderResult.findByTestId(
        'policyNameCellLink-revision'
      );
      expect(policyDetailsRevElement).toBeInTheDocument();
      expect(policyDetailsRevElement.textContent).toEqual(
        `rev. ${hostInfo.metadata.Endpoint.policy.applied.endpoint_policy_version}`
      );
    });

    it('should update the URL when policy name link is clicked', async () => {
      render();
      const policyDetailsLink = await renderResult.findByTestId('policyNameCellLink-link');
      const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(policyDetailsLink);
      });
      const changedUrlAction = await userChangedUrlChecker;
      expect(changedUrlAction.payload.pathname).toEqual(
        `${MANAGEMENT_PATH}/policy/${hostInfo.metadata.Endpoint.policy.applied.id}/settings`
      );
    });

    it('should update the URL when policy status link is clicked', async () => {
      render();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(policyStatusLink);
      });
      const changedUrlAction = await userChangedUrlChecker;
      expect(changedUrlAction.payload.search).toEqual(
        '?page_index=0&page_size=10&selected_endpoint=1&show=policy_response'
      );
    });

    it('should display Success overall policy status', async () => {
      getMockUseEndpointDetails(HostPolicyResponseActionStatus.success);
      render();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(renderResult.getByTestId('policyStatusValue-success')).toBeTruthy();
      expect(policyStatusBadge.textContent).toEqual('Success');
    });

    it('should display Warning overall policy status', async () => {
      getMockUseEndpointDetails(HostPolicyResponseActionStatus.warning);
      render();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Warning');
      expect(renderResult.getByTestId('policyStatusValue-warning')).toBeTruthy();
    });

    it('should display Failed overall policy status', async () => {
      getMockUseEndpointDetails(HostPolicyResponseActionStatus.failure);
      render();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Failed');
      expect(renderResult.getByTestId('policyStatusValue-failure')).toBeTruthy();
    });

    it('should display Unknown overall policy status', async () => {
      getMockUseEndpointDetails('' as HostPolicyResponseActionStatus);
      render();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Unknown');
      expect(renderResult.getByTestId('policyStatusValue-')).toBeTruthy();
    });

    it('should show the Take Action button', async () => {
      render();
      expect(renderResult.getByTestId('endpointDetailsActionsButton')).toBeInTheDocument();
    });

    describe('Activity Log tab', () => {
      beforeEach(() => {
        mockUseUiSetting$.mockImplementation((key, defaultValue) => {
          const useUiSetting$Mock = createUseUiSetting$Mock();

          return key === DEFAULT_TIMEPICKER_QUICK_RANGES
            ? [timepickerRanges, jest.fn()]
            : useUiSetting$Mock(key, defaultValue);
        });
      });

      afterEach(() => {
        reactTestingLibrary.cleanup();
      });

      describe('when `canReadActionsLogManagement` is TRUE', () => {
        it('should start with the activity log tab as unselected', () => {
          render();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.getByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).toHaveAttribute('aria-selected', 'false');
          expect(renderResult.getByTestId('endpointDetailsFlyoutBody')).toBeInTheDocument();
          expect(
            renderResult.queryByTestId('endpointActivityLogFlyoutBody')
          ).not.toBeInTheDocument();
        });

        it('should show the activity log content when selected', async () => {
          (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue(allowedExperimentalValues);

          render();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.getByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          await userEvent.click(activityLogTab);
          expect(detailsTab).toHaveAttribute('aria-selected', 'false');
          expect(activityLogTab).toHaveAttribute('aria-selected', 'true');
          expect(renderResult.getByTestId('endpointActivityLogFlyoutBody')).toBeInTheDocument();
          expect(renderResult.queryByTestId('endpointDetailsFlyoutBody')).not.toBeInTheDocument();
        });
      });

      describe('when `canReadActionsLogManagement` is FALSE', () => {
        it('should not show the response actions history tab', () => {
          mockUserPrivileges.mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: {
              ...mockInitialUserPrivilegesState().endpointPrivileges,
              canReadActionsLogManagement: false,
              canReadEndpointList: true,
              canAccessFleet: true,
            },
          });
          render();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.queryByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).not.toBeInTheDocument();
          expect(renderResult.getByTestId('endpointDetailsFlyoutBody')).toBeInTheDocument();
        });

        it('should show the overview tab when force loading actions history tab via URL', async () => {
          mockUserPrivileges.mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: {
              ...mockInitialUserPrivilegesState().endpointPrivileges,
              canReadActionsLogManagement: false,
              canReadEndpointList: true,
              canAccessFleet: true,
            },
          });
          reactTestingLibrary.act(() => {
            history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1&show=activity_log`);
          });

          render();
          await middlewareSpy.waitForAction('serverFinishedInitialization');

          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.queryByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).not.toBeInTheDocument();
          expect(renderResult.getByTestId('endpointDetailsFlyoutBody')).toBeInTheDocument();
        });
      });
    });

    describe('when showing host Policy Response panel', () => {
      beforeEach(async () => {
        coreStart.http.post.mockImplementation(async (requestOptions) => {
          if (requestOptions.path === HOST_METADATA_LIST_ROUTE) {
            return mockEndpointResultList({ total: 0 });
          }
          throw new Error(`POST to '${requestOptions.path}' does not have a mock response!`);
        });
        render();
        const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          reactTestingLibrary.fireEvent.click(policyStatusLink);
        });
        await userChangedUrlChecker;
      });

      afterEach(reactTestingLibrary.cleanup);

      it('should hide the host details panel', async () => {
        const endpointDetailsFlyout = renderResult.queryByTestId('endpointDetailsFlyoutBody');
        expect(endpointDetailsFlyout).not.toBeInTheDocument();
      });

      it('should display policy response sub-panel', async () => {
        expect(await renderResult.findByTestId('flyoutSubHeaderBackButton')).toBeInTheDocument();
        expect(
          await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutBody')
        ).toBeInTheDocument();
      });

      it('should include the back to details link', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        expect(subHeaderBackLink.textContent).toBe('Endpoint details');
        expect(subHeaderBackLink.getAttribute('href')).toEqual(
          `${APP_PATH}${MANAGEMENT_PATH}/endpoints?page_index=0&page_size=10&selected_endpoint=1&show=details`
        );
      });

      it('should update URL when back to details link is clicked', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          reactTestingLibrary.fireEvent.click(subHeaderBackLink);
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=details'
        );
      });
    });

    describe('when showing the Host Isolate panel', () => {
      const getKibanaServicesMock = KibanaServices.get as jest.Mock;
      const confirmIsolateAndWaitForApiResponse = async (
        typeOfResponse: 'success' | 'failure' = 'success'
      ) => {
        const isolateResponseAction = middlewareSpy.waitForAction(
          'endpointIsolationRequestStateChange',
          {
            validate(action) {
              if (typeOfResponse === 'failure') {
                return isFailedResourceState(action.payload);
              }

              return isLoadedResourceState(action.payload);
            },
          }
        );

        await act(async () => {
          fireEvent.click(renderResult.getByTestId('hostIsolateConfirmButton'));
          await isolateResponseAction;
        });
      };

      let isolateApiMock: ReturnType<typeof hostIsolationHttpMocks>;

      beforeEach(async () => {
        getKibanaServicesMock.mockReturnValue(coreStart);
        reactTestingLibrary.act(() => {
          history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1&show=isolate`);
        });
        render();
        await middlewareSpy.waitForAction('serverFinishedInitialization');

        // Need to reset `http.post` and adjust it so that the mock for http host
        // isolation api does not output error noise to the console
        coreStart.http.post.mockReset();
        coreStart.http.post.mockImplementation(async () => null);
        isolateApiMock = hostIsolationHttpMocks(coreStart.http);
      });

      it('should show the isolate form', () => {
        expect(renderResult.getByTestId('host_isolation_comment')).toBeInTheDocument();
      });

      it('should take you back to details when back link below the flyout header is clicked', async () => {
        const backButtonLink = renderResult.getByTestId('flyoutSubHeaderBackButton');

        expect(backButtonLink.getAttribute('href')).toEqual(
          `${APP_PATH}${getEndpointDetailsPath({
            name: 'endpointDetails',
            page_index: '0',
            page_size: '10',
            selected_endpoint: '1',
          })}`
        );

        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(backButtonLink);
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('take you back to details when Cancel button is clicked', async () => {
        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(renderResult.getByTestId('hostIsolateCancelButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('should isolate endpoint host when confirm is clicked', async () => {
        await confirmIsolateAndWaitForApiResponse();
        expect(renderResult.getByTestId('hostIsolateSuccessMessage')).toBeInTheDocument();
      });

      it('should navigate to details when the Complete button on success message is clicked', async () => {
        await confirmIsolateAndWaitForApiResponse();

        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(renderResult.getByTestId('hostIsolateSuccessCompleteButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('should show error if isolate fails', async () => {
        isolateApiMock.responseProvider.isolateHost.mockImplementation(() => {
          throw new Error('oh oh. something went wrong');
        });
        await confirmIsolateAndWaitForApiResponse('failure');

        expect(renderResult.getByText('oh oh. something went wrong')).toBeInTheDocument();
      });

      it('should reset isolation state and show form again', async () => {
        // ensures that after the host isolation has been successful, if user navigates away from the panel
        // (`show` is NOT `isolate`), then the state should be reset so that the form show up again the next
        // time `isolate host` is clicked
        await confirmIsolateAndWaitForApiResponse();
        expect(renderResult.getByTestId('hostIsolateSuccessMessage')).toBeInTheDocument();

        // Close flyout
        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');
        act(() => {
          fireEvent.click(renderResult.getByTestId('euiFlyoutCloseButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10',
        });

        expect(
          isUninitialisedResourceState(
            getCurrentIsolationRequestState(store.getState().management.endpoints)
          )
        ).toBe(true);
      });

      it('should NOT show the flyout footer', () => {
        expect(renderResult.queryByTestId('endpointDetailsFlyoutFooter')).not.toBeInTheDocument();
      });
    });
  });

  describe('when the more actions column is opened', () => {
    const generator = new EndpointDocGenerator('seed');
    let hostInfo: HostInfo[];
    let agentId: string;
    let agentPolicies: AgentPolicy[];
    let endpointActionsButton: HTMLElement;

    // 2nd endpoint only has isolation capabilities
    const mockEndpointListApi = () => {
      agentPolicies = [generator.generateAgentPolicy(), generator.generateAgentPolicy()];

      const { data: hosts } = mockEndpointResultList({ total: 2 });
      hostInfo = [
        {
          host_status: hosts[0].host_status,
          metadata: {
            ...hosts[0].metadata,
            Endpoint: {
              ...hosts[0].metadata.Endpoint,
              capabilities: [...ENDPOINT_CAPABILITIES],
              state: {
                ...hosts[0].metadata.Endpoint.state,
                isolation: false,
              },
            },
            host: {
              ...hosts[0].metadata.host,
              os: {
                ...hosts[0].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[0].metadata.agent,
              version: '7.14.0',
            },
          },
          last_checkin: hosts[0].last_checkin,
          policy_info: {
            agent: {
              applied: { id: agentPolicies[1].id, revision: 13 }, // host is assigned to the 2nd agent policy
              configured: { id: 'dont-care', revision: 39 },
            },
            endpoint: { id: 'dont-care', revision: 3 },
          },
        },
        {
          host_status: hosts[1].host_status,
          metadata: {
            ...hosts[1].metadata,
            Endpoint: {
              ...hosts[1].metadata.Endpoint,
              capabilities: ['isolation'],
              state: {
                ...hosts[1].metadata.Endpoint.state,
                isolation: false,
              },
            },
            host: {
              ...hosts[1].metadata.host,
              os: {
                ...hosts[1].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[1].metadata.agent,
              version: '8.4.0',
            },
          },
          last_checkin: hosts[1].last_checkin,
        },
      ];

      const packagePolicy = docGenerator.generatePolicyPackagePolicy();
      packagePolicy.id = hosts[0].metadata.Endpoint.policy.applied.id;

      agentId = hosts[0].metadata.elastic.agent.id;
      packagePolicy.policy_ids = [agentPolicies[0].id, agentPolicies[1].id]; // package is assigned to two agent policies

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: hostInfo,
        endpointPackagePolicies: [packagePolicy],
        agentPolicy: agentPolicies[0],
      });
    };

    beforeEach(async () => {
      mockEndpointListApi();
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints`);
      });

      render();
      await middlewareSpy.waitForAction('serverReturnedEndpointList');

      endpointActionsButton = (await renderResult.findAllByTestId('endpointTableRowActions'))[0];

      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });

    it('shows the Responder option when all 3 processes capabilities are present in the endpoint', async () => {
      const responderButton = await renderResult.findByTestId('console');
      expect(responderButton).not.toHaveAttribute('disabled');
    });

    it('navigates to the Response actions history flyout', async () => {
      const actionsLink = await renderResult.findByTestId('actionsLink');

      expect(actionsLink.getAttribute('href')).toEqual(
        `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointActivityLog',
          page_index: '0',
          page_size: '10',
          selected_endpoint: hostInfo[0].metadata.agent.id,
        })}`
      );
    });

    it('navigates to the Host Details Isolate flyout', async () => {
      const isolateLink = await renderResult.findByTestId('isolateLink');
      expect(isolateLink.getAttribute('href')).toEqual(
        `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointIsolate',
          page_index: '0',
          page_size: '10',
          selected_endpoint: hostInfo[0].metadata.agent.id,
        })}`
      );
    });

    it('hides isolate host option if canIsolateHost is false', () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: false,
        },
      });
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
      const isolateLink = screen.queryByTestId('isolateLink');
      expect(isolateLink).not.toBeInTheDocument();
    });

    it('navigates to the Security Solution Host Details page', async () => {
      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink.getAttribute('href')).toEqual(
        `${APP_PATH}/hosts/${hostInfo[0].metadata.host.hostname.toLowerCase()}`
      );
    });
    it('navigates to the correct Ingest Agent Policy page', async () => {
      const agentPolicyLink = await renderResult.findByTestId('agentPolicyLink');
      expect(agentPolicyLink.getAttribute('href')).toEqual(
        `/app/fleet/policies/${agentPolicies[1].id}`
      );
    });
    it('navigates to the Ingest Agent Details page', async () => {
      const agentDetailsLink = await renderResult.findByTestId('agentDetailsLink');
      expect(agentDetailsLink.getAttribute('href')).toEqual(`/app/fleet/agents/${agentId}`);
    });

    it('navigates to the Ingest Agent Details page with policy reassign', async () => {
      const agentPolicyReassignLink = await renderResult.findByTestId('agentPolicyReassignLink');
      expect(agentPolicyReassignLink.getAttribute('href')).toEqual(
        `/app/fleet/agents/${agentId}?openReassignFlyout=true`
      );
    });
  });

  describe('required transform failed banner', () => {
    beforeEach(() => {
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });
    it('is not displayed when transform state is not failed', () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.STARTED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).not.toBeInTheDocument();
    });

    it('is not displayed when non-relevant transform is failing', () => {
      const transforms: TransformStats[] = [
        { id: 'not-metadata', state: TRANSFORM_STATES.FAILED } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).not.toBeInTheDocument();
    });

    it('is not displayed when no endpoint policy', () => {
      const transforms: TransformStats[] = [
        { id: 'not-metadata', state: TRANSFORM_STATES.FAILED } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: [],
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).not.toBeInTheDocument();
    });

    it('is displayed when relevant transform state is failed state', async () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.FAILED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = await screen.findByTestId('callout-endpoints-list-transform-failed');
      expect(banner).toBeInTheDocument();
    });

    it('displays correct transform id when in failed state', async () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.STARTED,
        } as TransformStats,
        {
          id: `${METADATA_UNITED_TRANSFORM}-1.2.1`,
          state: TRANSFORM_STATES.FAILED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = await screen.findByTestId('callout-endpoints-list-transform-failed');
      expect(banner).not.toHaveTextContent(transforms[0].id);
      expect(banner).toHaveTextContent(transforms[1].id);
    });
  });

  describe('endpoint list onboarding screens with RBAC', () => {
    beforeEach(() => {
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
    });
    afterEach(() => {
      mockUserPrivileges.mockReset();
    });
    it('user has endpoint list ALL and fleet All and can view entire onboarding screen', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canWriteEndpointList: true,
          canAccessFleet: true,
        }),
      });
      render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).toBeInTheDocument();
    });
    it('user has endpoint list READ and fleet All and can view entire onboarding screen', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadEndpointList: true,
          canAccessFleet: true,
        }),
      });
      render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).toBeInTheDocument();
    });
    it('user has endpoint list ALL/READ and fleet NONE and can view a modified onboarding screen with no actions link to fleet', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadEndpointList: true,
          canAccessFleet: false,
        }),
      });
      render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('policyOnboardingInstructions');
      expect(onboardingSteps).toBeInTheDocument();
      const noPrivilegesPage = await renderResult.findByTestId('noFleetAccess');
      expect(noPrivilegesPage).toBeInTheDocument();
      const startButton = renderResult.queryByTestId('onboardingStartButton');
      expect(startButton).not.toBeInTheDocument();
    });
  });

  describe('endpoint list take action with RBAC controls', () => {
    const renderAndClickActionsButton = async (tableRow: number = 0) => {
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints`);
      });

      render();
      await middlewareSpy.waitForAction('serverReturnedEndpointList');

      const endpointActionsButton: HTMLElement = (
        await renderResult.findAllByTestId('endpointTableRowActions')
      )[tableRow];

      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
    };

    beforeEach(async () => {
      const { data: hosts } = mockEndpointResultList({ total: 2 });
      // the second host is isolated, for unisolate testing
      const hostInfo: HostInfo[] = [
        {
          host_status: hosts[0].host_status,
          metadata: {
            ...hosts[0].metadata,
            Endpoint: {
              ...hosts[0].metadata.Endpoint,
              capabilities: [...ENDPOINT_CAPABILITIES],
              state: {
                ...hosts[0].metadata.Endpoint.state,
                isolation: false,
              },
            },
            host: {
              ...hosts[0].metadata.host,
              os: {
                ...hosts[0].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[0].metadata.agent,
              version: '7.14.0',
            },
          },
          last_checkin: hosts[0].last_checkin,
        },
        {
          host_status: hosts[1].host_status,
          metadata: {
            ...hosts[1].metadata,
            Endpoint: {
              ...hosts[1].metadata.Endpoint,
              capabilities: ['isolation'],
              state: {
                ...hosts[1].metadata.Endpoint.state,
                isolation: true,
              },
            },
            host: {
              ...hosts[1].metadata.host,
              os: {
                ...hosts[1].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[1].metadata.agent,
              version: '8.4.0',
            },
          },
          last_checkin: hosts[1].last_checkin,
        },
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: hostInfo,
        endpointPackagePolicies: mockPolicyResultList({ total: 2 }).items,
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });
    it('shows Isolate host option if canHostIsolate is READ/ALL', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: true,
        },
      });
      await renderAndClickActionsButton();
      const isolateLink = await renderResult.findByTestId('isolateLink');
      expect(isolateLink).toBeInTheDocument();
    });
    it('hides Isolate host option if canIsolateHost is NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: false,
        },
      });
      await renderAndClickActionsButton();
      const isolateLink = screen.queryByTestId('isolateLink');
      expect(isolateLink).not.toBeInTheDocument();
    });
    it('shows unisolate host option if canUnHostIsolate is READ/ALL', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canUnIsolateHost: true,
        },
      });
      await renderAndClickActionsButton(1);
      const unisolateLink = await renderResult.findByTestId('unIsolateLink');
      expect(unisolateLink).toBeInTheDocument();
    });
    it('hides unisolate host option if canUnIsolateHost is NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canUnIsolateHost: false,
        },
      });
      await renderAndClickActionsButton(1);
      const unisolateLink = renderResult.queryByTestId('unIsolateLink');
      expect(unisolateLink).not.toBeInTheDocument();
    });

    it('shows the Responder option when at least one rbac privilege from host isolation, process operation and file operation, is set to TRUE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessResponseConsole: true,
        },
      });
      await renderAndClickActionsButton();
      const responderButton = await renderResult.findByTestId('console');
      expect(responderButton).toBeInTheDocument();
    });

    it('hides the Responder option when host isolation, process operation and file operations are ALL set to NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessResponseConsole: false,
        },
      });
      await renderAndClickActionsButton();
      const responderButton = renderResult.queryByTestId('console');
      expect(responderButton).not.toBeInTheDocument();
    });
    it('always shows the Host details link', async () => {
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
      await renderAndClickActionsButton();
      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink).toBeInTheDocument();
    });
    it('shows Agent Policy, View Agent Details and Reassign Policy Links when canReadFleetAgents,canWriteFleetAgents,canReadFleetAgentPolicies RBAC control is enabled', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessFleet: true,
          canReadFleetAgents: true,
          canWriteFleetAgents: true,
          canReadFleetAgentPolicies: true,
        },
      });
      await renderAndClickActionsButton();
      const agentPolicyLink = await renderResult.findByTestId('agentPolicyLink');
      const agentDetailsLink = await renderResult.findByTestId('agentDetailsLink');
      const agentPolicyReassignLink = await renderResult.findByTestId('agentPolicyReassignLink');
      expect(agentPolicyLink).toBeInTheDocument();
      expect(agentDetailsLink).toBeInTheDocument();
      expect(agentPolicyReassignLink).toBeInTheDocument();
    });
    it('hides Agent Policy, View Agent Details and Reassign Policy Links when canAccessFleet RBAC control is NOT enabled', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessFleet: false,
        },
      });
      await renderAndClickActionsButton();
      const agentPolicyLink = renderResult.queryByTestId('agentPolicyLink');
      const agentDetailsLink = renderResult.queryByTestId('agentDetailsLink');
      const agentPolicyReassignLink = renderResult.queryByTestId('agentPolicyReassignLink');
      expect(agentPolicyLink).not.toBeInTheDocument();
      expect(agentDetailsLink).not.toBeInTheDocument();
      expect(agentPolicyReassignLink).not.toBeInTheDocument();
    });
  });
});
