/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery as _useQuery } from '@tanstack/react-query';
import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { allFleetHttpMocks } from '../../mocks';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { useFetchEndpointPolicy } from './use_fetch_endpoint_policy';
import type { PolicyData } from '../../../../common/endpoint/types';
import {
  DefaultPolicyNotificationMessage,
  DefaultPolicyRuleNotificationMessage,
} from '../../../../common/endpoint/models/policy_config';
import { set } from '@kbn/safer-lodash-set';
import { API_VERSIONS } from '@kbn/fleet-plugin/common';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('When using the `useGetFileInfo()` hook', () => {
  type HookRenderer = ReactQueryHookRenderer<
    Parameters<typeof useFetchEndpointPolicy>,
    ReturnType<typeof useFetchEndpointPolicy>
  >;

  let policy: PolicyData;
  let queryOptions: NonNullable<Parameters<typeof useFetchEndpointPolicy>[1]>;
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
        useFetchEndpointPolicy(policy.id, queryOptions)
      );
    };
  });

  it('should call the correct api with expected value', async () => {
    await renderHook();

    expect(apiMocks.responseProvider.endpointPackagePolicy).toHaveBeenCalledWith({
      path: `/api/fleet/package_policies/${policy.id}`,
      version: API_VERSIONS.public.v1,
    });
  });

  it('should return the expected output', async () => {
    apiMocks.responseProvider.endpointPackagePolicy.mockReturnValueOnce({
      item: policy,
    });
    const { data } = await renderHook();

    expect(data).toEqual({
      item: policy,
      settings: policy.inputs[0].config.policy.value,
      artifactManifest: policy.inputs[0].config.artifact_manifest.value,
    });
  });

  it('should apply defaults to the policy data if necessary', async () => {
    policy.updated_at = expect.any(String);
    policy.created_at = expect.any(String);
    // Expected updates by the hook
    const policySettings = policy.inputs[0].config.policy.value;
    [
      'windows.popup.malware.message',
      'mac.popup.malware.message',
      'linux.popup.malware.message',
      'windows.popup.ransomware.message',
    ].forEach((keyPath) => {
      set(policySettings, keyPath, DefaultPolicyNotificationMessage);
    });
    [
      'windows.popup.memory_protection.message',
      'windows.popup.behavior_protection.message',
      'mac.popup.behavior_protection.message',
      'linux.popup.behavior_protection.message',
    ].forEach((keyPath) => {
      set(policySettings, keyPath, DefaultPolicyRuleNotificationMessage);
    });
    // These should not be updated by the hook since the API response has them already defined
    set(policySettings, 'mac.popup.memory_protection.message', 'hello world for mac');
    set(policySettings, 'linux.popup.memory_protection.message', 'hello world for linux');

    // Setup API response with two of the messages having a value defined.
    const apiResponsePolicy = new FleetPackagePolicyGenerator(
      'seed'
    ).generateEndpointPackagePolicy();
    set(
      apiResponsePolicy.inputs[0].config.policy.value,
      'mac.popup.memory_protection.message',
      'hello world for mac'
    );
    set(
      apiResponsePolicy.inputs[0].config.policy.value,
      'linux.popup.memory_protection.message',
      'hello world for linux'
    );
    apiMocks.responseProvider.endpointPackagePolicy.mockReturnValueOnce({
      item: apiResponsePolicy,
    });

    const { data } = await renderHook();

    expect(data).toEqual({
      item: policy,
      settings: policy.inputs[0].config.policy.value,
      artifactManifest: policy.inputs[0].config.artifact_manifest.value,
    });
  });

  it('should apply default values to api returned data', async () => {
    queryOptions.queryKey = ['a', 'b'];
    queryOptions.retry = false;
    queryOptions.refetchInterval = 5;
    await renderHook();

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining(queryOptions));
  });
});
