/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createFleetContextRendererMock, generateFleetPackageInfo } from '../mocks';
import { EndpointPackageCustomExtension } from './endpoint_package_custom_extension';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { getUserPrivilegesMockDefaultValue } from '../../../../../../common/components/user_privileges/__mocks__';

jest.mock('../../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;
jest.mock('../../../../../../common/hooks/use_license');
const useLicenseMock = _useLicense as jest.MockedFunction<typeof _useLicense>;

describe('When displaying the EndpointPackageCustomExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedTestContext: AppContextTestRender;
  const artifactCards = Object.freeze([
    { privilege: 'canReadTrustedApplications', testId: 'trustedApps-fleetCard' },
    { privilege: 'canReadEventFilters', testId: 'eventFilters-fleetCard' },
    { privilege: 'canReadEndpointExceptions', testId: 'endpointExceptions-fleetCard' },
    { privilege: 'canReadHostIsolationExceptions', testId: 'hostIsolationExceptions-fleetCard' },
    { privilege: 'canReadBlocklist', testId: 'blocklists-fleetCard' },
    { privilege: 'canReadTrustedDevices', testId: 'trustedDevices-fleetCard' },
    { privilege: 'canReadCustomYaraSignatures', testId: 'customYaraSignatures-fleetCard' },
  ]);

  beforeEach(() => {
    mockedTestContext = createFleetContextRendererMock();

    // Mock experimental feature flag
    mockedTestContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: true,
      customYaraSignaturesEnabled: true,
      trustedDevices: true,
    });

    useLicenseMock.mockReturnValue(licenseServiceMocked);

    render = () => {
      renderResult = mockedTestContext.render(
        <EndpointPackageCustomExtension
          pkgkey="endpoint-8.2.0"
          packageInfo={generateFleetPackageInfo()}
        />
      );

      return renderResult;
    };
  });

  afterEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  it.each([...artifactCards])('should show artifact card: `$testId`', ({ testId }) => {
    render();

    expect(renderResult.getByTestId(testId)).toBeInTheDocument();
  });

  it('should NOT show artifact card if none of the artifact privileges are present', () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadBlocklist: false,
        canReadEventFilters: false,
        canReadHostIsolationExceptions: false,
        canDeleteHostIsolationExceptions: false,
        canReadTrustedApplications: false,
        canReadTrustedDevices: false,
        canReadEndpointExceptions: false,
        canReadCustomYaraSignatures: false,
      }),
    });

    render();

    artifactCards.forEach(({ testId }) => {
      expect(renderResult.queryByTestId(testId)).not.toBeInTheDocument();
    });
    expect(renderResult.queryByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it.each([...artifactCards])(
    'should show $testId artifact card when only $privilege privilege is present',
    ({ testId, privilege }) => {
      useUserPrivilegesMock.mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadBlocklist: false,
          canReadEventFilters: false,
          canReadHostIsolationExceptions: false,
          canDeleteHostIsolationExceptions: false,
          canReadTrustedApplications: false,
          canReadTrustedDevices: false,
          canReadEndpointExceptions: false,
          canReadCustomYaraSignatures: false,

          [privilege]: true,
        }),
      });

      render();

      artifactCards.forEach((card) => {
        if (card.testId === testId) {
          expect(renderResult.getByTestId(card.testId)).toBeInTheDocument();
        } else {
          expect(renderResult.queryByTestId(card.testId)).not.toBeInTheDocument();
        }
      });
    }
  );

  it('should only show loading spinner if loading', () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({ loading: true }),
    });

    render();

    expect(renderResult.getByTestId('endpointExtensionLoadingSpinner')).toBeInTheDocument();
    expect(renderResult.queryByTestId('fleetEndpointPackageCustomContent')).not.toBeInTheDocument();
    expect(renderResult.queryByTestId('noIngestPermissions')).not.toBeInTheDocument();
  });

  it('should hide endpoint exceptions card when feature flag is disabled', () => {
    mockedTestContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: false,
    });
    render();

    // Verify endpoint exceptions card is not present
    expect(renderResult.queryByTestId('endpointExceptions-fleetCard')).not.toBeInTheDocument();

    // Verify other cards are still visible
    expect(renderResult.getByTestId('trustedApps-fleetCard')).toBeInTheDocument();
    expect(renderResult.getByTestId('eventFilters-fleetCard')).toBeInTheDocument();
    expect(renderResult.getByTestId('hostIsolationExceptions-fleetCard')).toBeInTheDocument();
    expect(renderResult.getByTestId('blocklists-fleetCard')).toBeInTheDocument();
  });

  it('should show no privileges when endpoint exceptions is the only artifact privilege and the feature flag is disabled', () => {
    mockedTestContext.setExperimentalFlag({
      endpointExceptionsMovedUnderManagement: false,
      customYaraSignaturesEnabled: true,
    });
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadBlocklist: false,
        canReadEventFilters: false,
        canReadHostIsolationExceptions: false,
        canDeleteHostIsolationExceptions: false,
        canReadTrustedApplications: false,
        canReadEndpointExceptions: true,
        canReadTrustedDevices: false,
        canReadCustomYaraSignatures: false,
      }),
    });

    render();

    expect(renderResult.queryByTestId('fleetEndpointPackageCustomContent')).not.toBeInTheDocument();
    expect(renderResult.queryByTestId('endpointExceptions-fleetCard')).not.toBeInTheDocument();
    expect(renderResult.queryByTestId('noPrivilegesPage')).toBeTruthy();
  });

  it('should hide yara signatures card when feature flag is disabled', () => {
    mockedTestContext.setExperimentalFlag({
      customYaraSignaturesEnabled: false,
    });
    render();

    expect(renderResult.queryByTestId('customYaraSignatures-fleetCard')).not.toBeInTheDocument();
  });

  it('should show no privileges when yara signatures is the only artifact privilege and the feature flag is disabled', () => {
    mockedTestContext.setExperimentalFlag({
      customYaraSignaturesEnabled: false,
    });
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadBlocklist: false,
        canReadEventFilters: false,
        canReadHostIsolationExceptions: false,
        canDeleteHostIsolationExceptions: false,
        canReadTrustedApplications: false,
        canReadEndpointExceptions: false,
        canReadTrustedDevices: false,
        canReadCustomYaraSignatures: true,
      }),
    });

    render();

    expect(renderResult.queryByTestId('fleetEndpointPackageCustomContent')).not.toBeInTheDocument();
    expect(renderResult.queryByTestId('customYaraSignatures-fleetCard')).not.toBeInTheDocument();
    expect(renderResult.queryByTestId('noPrivilegesPage')).toBeTruthy();
  });
});
