/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery as _useQuery } from '@tanstack/react-query';
import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { PolicyData } from '../../../../common/endpoint/types';
import { allFleetHttpMocks } from '../../mocks';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { useFetchAgentByAgentPolicySummary } from './use_fetch_endpoint_policy_agent_summary';
import type { GetAgentStatusResponse } from '@kbn/fleet-plugin/common';
import { agentRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('When using the `useFetchEndpointPolicyAgentSummary()` hook', () => {
  type HookRenderer = ReactQueryHookRenderer<
    Parameters<typeof useFetchAgentByAgentPolicySummary>,
    ReturnType<typeof useFetchAgentByAgentPolicySummary>
  >;

  let policy: PolicyData;
  let queryOptions: NonNullable<Parameters<typeof useFetchAgentByAgentPolicySummary>[1]>;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let renderHook: () => ReturnType<HookRenderer>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    queryOptions = {};
    http = testContext.coreStart.http;
    apiMocks = allFleetHttpMocks(http);
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();
    renderHook = () => {
      return (testContext.renderReactQueryHook as HookRenderer)(() =>
        useFetchAgentByAgentPolicySummary(policy.policy_ids, queryOptions)
      );
    };
  });

  it('should call the correct api with expected value', async () => {
    const { data } = await renderHook();

    expect(apiMocks.responseProvider.agentStatus).toHaveBeenCalledWith({
      path: agentRouteService.getStatusPath(),
      query: { policyId: policy.policy_ids[0] },
      version: API_VERSIONS.public.v1,
    });
    const expectedData: GetAgentStatusResponse['results'] = {
      active: 50,
      all: 0,
      inactive: 5,
      online: 40,
      error: 0,
      offline: 5,
      updating: 0,
      other: 0,
      events: 0,
      unenrolled: 0,
    };
    expect(data).toEqual(expectedData);
  });

  it('should apply default values to api returned data', async () => {
    queryOptions.queryKey = ['a', 'b'];
    queryOptions.retry = false;
    queryOptions.refetchInterval = 5;
    await renderHook();

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining(queryOptions));
  });

  it('should call the correct api with multiple policy ids', async () => {
    policy.policy_ids = ['1', '2', '3'];
    await renderHook();

    expect(apiMocks.responseProvider.agentStatus).toHaveBeenCalledWith({
      path: agentRouteService.getStatusPath(),
      query: { kuery: 'policy_id:1 OR policy_id:2 OR policy_id:3' },
      version: API_VERSIONS.public.v1,
    });
  });
});
