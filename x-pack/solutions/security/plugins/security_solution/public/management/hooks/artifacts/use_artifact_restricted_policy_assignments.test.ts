/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactFormComponentProps } from '../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { buildPerPolicyTag } from '../../../../common/endpoint/service/artifacts/utils';
import type { ArtifactRestrictedPolicyAssignments } from './use_artifact_restricted_policy_assignments';
import { useArtifactRestrictedPolicyAssignments } from './use_artifact_restricted_policy_assignments';
import { fleetBulkGetPackagePoliciesListHttpMock } from '../../mocks';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { waitFor } from '@testing-library/dom';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { RenderHookResult } from '@testing-library/react';

describe('useArtifactRestrictedPolicyAssignments()', () => {
  let testContext: AppContextTestRender;
  let item: ArtifactFormComponentProps['item'];
  let renderHook: () => RenderHookResult<ArtifactRestrictedPolicyAssignments, unknown>;

  beforeEach(() => {
    testContext = createAppRootMockRenderer();

    renderHook = () => {
      return testContext.renderHook(() => {
        return useArtifactRestrictedPolicyAssignments(item);
      });
    };

    testContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: true });

    item = new ExceptionsListItemGenerator('seed').generateTrustedApp({
      tags: [buildPerPolicyTag('1'), buildPerPolicyTag('2'), buildPerPolicyTag('3')],
    });

    const fleetApiMocks = fleetBulkGetPackagePoliciesListHttpMock(testContext.coreStart.http);
    const fleetPackagePolicyGenerator = new FleetPackagePolicyGenerator('seed');
    fleetApiMocks.responseProvider.bulkPackagePolicies.mockReturnValue({
      items: [
        fleetPackagePolicyGenerator.generate({ id: '1' }),
        fleetPackagePolicyGenerator.generate({ id: '2' }),
      ],
    });
  });

  it('should return empty array when feature flag is disabled', () => {
    testContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: false });
    const { result } = renderHook();

    expect(result.current).toEqual({ isLoading: false, policyIds: [] });
  });

  it('should set loading property to true while fetching policies', async () => {
    const { result } = renderHook();

    expect(result.current).toEqual({ isLoading: true, policyIds: [] });
  });

  it('should call fleet api with list of policy ids', async () => {
    renderHook();

    await waitFor(() => {
      expect(testContext.coreStart.http.post).toHaveBeenCalledWith(
        packagePolicyRouteService.getBulkGetPath(),
        expect.objectContaining({
          body: JSON.stringify({ ids: ['1', '2', '3'], ignoreMissing: true }),
        })
      );
    });
  });

  it('should return list of policies that were not found in fleet', async () => {
    const { result } = renderHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.policyIds).toEqual(['3']);
  });
});
