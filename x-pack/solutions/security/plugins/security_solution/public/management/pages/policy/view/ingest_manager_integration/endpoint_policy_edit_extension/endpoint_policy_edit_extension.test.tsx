/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PackagePolicy, NewPackagePolicy } from '@kbn/fleet-plugin/common';

import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { EndpointPolicyEditExtension } from './endpoint_policy_edit_extension';
import { createFleetContextRendererMock } from '../mocks';
import { getUserPrivilegesMockDefaultValue } from '../../../../../../common/components/user_privileges/__mocks__';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { getPolicyDataForUpdate } from '../../../../../../../common/endpoint/service/policy';

jest.mock('../../../../../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('When displaying the EndpointPolicyEditExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let mockedTestContext: AppContextTestRender;
  const artifactCards = Object.freeze([
    'trustedApps-fleet-integration-card',
    'eventFilters-fleet-integration-card',
    'endpointExceptions-fleet-integration-card',
    'hostIsolationExceptions-fleet-integration-card',
    'blocklists-fleet-integration-card',
  ]);

  beforeEach(() => {
    mockedTestContext = createFleetContextRendererMock();

    // Enable endpoint exceptions feature
    mockedTestContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: true,
    });

    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      id: 'someid',
    });
    const newPolicy = getPolicyDataForUpdate(policy);

    render = () =>
      mockedTestContext.render(
        <EndpointPolicyEditExtension
          policy={policy as PackagePolicy}
          newPolicy={newPolicy as NewPackagePolicy}
          onChange={jest.fn()}
        />
      );
  });

  afterEach(() => {
    useUserPrivilegesMock.mockReturnValue(getUserPrivilegesMockDefaultValue());
  });

  it.each([...artifactCards])('should show artifact card `%s`', (artifactCardTestId) => {
    const renderResult = render();

    expect(renderResult.getByTestId(artifactCardTestId)).toBeTruthy();
  });

  it.each([...artifactCards])(
    'should NOT show artifact cards if no endpoint management authz: %s',
    (artifactCardTestId) => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadTrustedApplications: false,
          canReadEventFilters: false,
          canReadBlocklist: false,
          canReadHostIsolationExceptions: false,
          canReadEndpointExceptions: false,
        }),
      });
      const renderResult = render();

      expect(renderResult.queryByTestId(artifactCardTestId)).toBeNull();
    }
  );

  it.each([
    ['trustedApps', 'trusted_apps'],
    ['eventFilters', 'event_filters'],
    ['endpointExceptions', 'endpoint_exceptions'],
    ['hostIsolationExceptions', 'host_isolation_exceptions'],
    ['blocklists', 'blocklist'],
  ])(
    'should link to the %s list page if no Authz for policy management',
    (artifactTestIdPrefix, pageUrlName) => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadPolicyManagement: false,
        }),
      });

      const { getByTestId } = render();

      expect(
        getByTestId(`${artifactTestIdPrefix}-link-to-exceptions`).getAttribute('href')
      ).toEqual(`/app/security/administration/${pageUrlName}?includedPolicies=someid%2Cglobal`);
    }
  );

  it('should not display endpoint exceptions card when feature flag is disabled', () => {
    mockedTestContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: false,
    });

    const renderResult = render();

    // Endpoint exceptions card should not be present
    expect(
      renderResult.queryByTestId('endpointExceptions-fleet-integration-card')
    ).not.toBeInTheDocument();

    // Other cards should still be visible
    expect(renderResult.getByTestId('trustedApps-fleet-integration-card')).toBeInTheDocument();
    expect(renderResult.getByTestId('eventFilters-fleet-integration-card')).toBeInTheDocument();
    expect(
      renderResult.getByTestId('hostIsolationExceptions-fleet-integration-card')
    ).toBeInTheDocument();
    expect(renderResult.getByTestId('blocklists-fleet-integration-card')).toBeInTheDocument();
  });
});
