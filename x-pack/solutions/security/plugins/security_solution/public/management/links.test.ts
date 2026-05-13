/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

import { SecurityPageName } from '../app/types';

import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { StartPlugins } from '../types';
import { getFirstAllowedArtifactPath, getManagementFilteredLinks, links } from './links';
import {
  getEndpointExceptionsListPath,
  getEventFiltersListPath,
  getTrustedAppsListPath,
} from './common/routing';
import { allowedExperimentalValues } from '../../common/experimental_features';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';
import { getEndpointAuthzInitialStateMock } from '../../common/endpoint/service/authz/mocks';
import { licenseService as _licenseService } from '../common/hooks/use_license';
import type { LicenseService } from '../../common/license';
import { createLicenseServiceMock } from '../../common/license/mocks';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';

jest.mock('../common/hooks/use_license');

jest.mock('../../common/endpoint/service/authz', () => {
  const originalModule = jest.requireActual('../../common/endpoint/service/authz');
  return {
    ...originalModule,
    calculateEndpointAuthz: jest.fn(),
  };
});

jest.mock('../common/lib/kibana');

const licenseServiceMock = _licenseService as jest.Mocked<LicenseService>;

describe('links', () => {
  let coreMockStarted: ReturnType<typeof coreMock.createStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

  const getLinksWithout = (...excludedLinks: SecurityPageName[]) => ({
    ...links,
    links: links.links?.filter((link) => !excludedLinks.includes(link.id)),
  });

  const getPlugins = (noUserAuthz: boolean = false): StartPlugins => {
    return {
      security: {
        authc: {
          getCurrentUser: noUserAuthz
            ? jest.fn().mockReturnValue(undefined)
            : jest.fn().mockReturnValue([]),
        },
      },
      fleet: {
        authz: createFleetAuthzMock(),
      },
    } as unknown as StartPlugins;
  };

  beforeAll(() => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: { ...allowedExperimentalValues },
    });
  });

  beforeEach(() => {
    coreMockStarted = coreMock.createStart();
    fakeHttpServices = coreMockStarted.http as jest.Mocked<HttpSetup>;
  });

  afterEach(() => {
    fakeHttpServices.get.mockClear();
    Object.assign(licenseServiceMock, createLicenseServiceMock());
  });

  describe('Endpoints category structure', () => {
    it('should order Endpoints section links as Endpoints, Policies, Artifacts, Response actions history, Script library', () => {
      const endpointsCategory = links.categories?.find((category) =>
        category.linkIds?.includes(SecurityPageName.endpoints)
      );
      expect(endpointsCategory).toBeDefined();
      expect(endpointsCategory?.linkIds).toEqual([
        SecurityPageName.endpoints,
        SecurityPageName.policies,
        SecurityPageName.artifacts,
        SecurityPageName.responseActionsHistory,
        SecurityPageName.scriptLibrary,
      ]);
    });
  });

  describe('getFirstAllowedArtifactPath', () => {
    const experimentalDefaults = {
      ...allowedExperimentalValues,
      endpointExceptionsMovedUnderManagement: true,
      trustedDevices: true,
    };

    it('should return endpoint exceptions path when FF is on and user can read endpoint exceptions', () => {
      expect(
        getFirstAllowedArtifactPath(
          {
            canReadEndpointExceptions: true,
            canReadTrustedApplications: true,
            canReadTrustedDevices: true,
            canReadEventFilters: true,
            showHostIsolationExceptions: true,
            canReadBlocklist: true,
          },
          experimentalDefaults
        )
      ).toBe(getEndpointExceptionsListPath());
    });

    it('should return trusted apps path when endpoint exceptions not allowed but trusted apps are', () => {
      expect(
        getFirstAllowedArtifactPath(
          {
            canReadEndpointExceptions: false,
            canReadTrustedApplications: true,
            canReadTrustedDevices: false,
            canReadEventFilters: false,
            showHostIsolationExceptions: false,
            canReadBlocklist: false,
          },
          experimentalDefaults
        )
      ).toBe(getTrustedAppsListPath());
    });

    it('should return event filters path when only event filters are readable', () => {
      expect(
        getFirstAllowedArtifactPath(
          {
            canReadEndpointExceptions: false,
            canReadTrustedApplications: false,
            canReadTrustedDevices: false,
            canReadEventFilters: true,
            showHostIsolationExceptions: false,
            canReadBlocklist: false,
          },
          experimentalDefaults
        )
      ).toBe(getEventFiltersListPath());
    });

    it('should return trusted apps path when endpoint exceptions FF is off even if user can read them', () => {
      expect(
        getFirstAllowedArtifactPath(
          {
            canReadEndpointExceptions: true,
            canReadTrustedApplications: true,
            canReadTrustedDevices: false,
            canReadEventFilters: false,
            showHostIsolationExceptions: false,
            canReadBlocklist: false,
          },
          {
            ...allowedExperimentalValues,
            endpointExceptionsMovedUnderManagement: false,
            trustedDevices: true,
          }
        )
      ).toBe(getTrustedAppsListPath());
    });

    it('should fall back to trusted apps path when no artifact read privilege matches', () => {
      expect(
        getFirstAllowedArtifactPath(
          {
            canReadEndpointExceptions: false,
            canReadTrustedApplications: false,
            canReadTrustedDevices: false,
            canReadEventFilters: false,
            showHostIsolationExceptions: false,
            canReadBlocklist: false,
          },
          experimentalDefaults
        )
      ).toBe(getTrustedAppsListPath());
    });
  });

  it('should return all links for user with all sub-feature privileges', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
      ...allowedExperimentalValues,
    });
    expect(filteredLinks.links?.map((l) => l.id)).toEqual(links.links?.map((l) => l.id));
    const artifactsLink = filteredLinks.links?.find((l) => l.id === SecurityPageName.artifacts);
    expect(artifactsLink?.path).toBeDefined();
  });

  it('should not return any endpoint management link for user with all sub-feature privileges when no user authz', async () => {
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(true), {
      ...allowedExperimentalValues,
    });
    expect(filteredLinks).toEqual(
      getLinksWithout(
        SecurityPageName.artifacts,
        SecurityPageName.endpoints,
        SecurityPageName.policies,
        SecurityPageName.responseActionsHistory,
        SecurityPageName.cloudDefendPolicies,
        SecurityPageName.scriptLibrary
      )
    );
  });

  describe('Action Logs', () => {
    it('should return all but response actions link when no actions log access', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadActionsLogManagement: false,
          canDeleteHostIsolationExceptions: false,
        })
      );
      fakeHttpServices.get.mockResolvedValue({ total: 0 });

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });
      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.responseActionsHistory).links?.map((l) => l.id)
      );
    });
  });

  describe('Artifacts', () => {
    it('should hide Artifacts when user has no artifact privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointExceptions: false,
          canReadTrustedApplications: false,
          canReadTrustedDevices: false,
          canReadEventFilters: false,
          canReadHostIsolationExceptions: false,
          canAccessHostIsolationExceptions: false,
          canReadBlocklist: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.artifacts));
    });

    it('should show Artifacts when user has at least one artifact privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointExceptions: false,
          canReadTrustedApplications: false,
          canReadTrustedDevices: false,
          canReadEventFilters: false,
          canReadHostIsolationExceptions: false,
          canAccessHostIsolationExceptions: false,
          canReadBlocklist: true,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });

      const artifactsLink = filteredLinks.links?.find((l) => l.id === SecurityPageName.artifacts);
      expect(artifactsLink).toBeDefined();
      expect(artifactsLink?.path).toBeDefined();
    });

    it('should set Artifacts link path to first allowed artifact tab (event filters only)', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointExceptions: false,
          canReadTrustedApplications: false,
          canReadTrustedDevices: false,
          canReadEventFilters: true,
          canReadHostIsolationExceptions: false,
          canAccessHostIsolationExceptions: false,
          canReadBlocklist: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });

      const artifactsLink = filteredLinks.links?.find((l) => l.id === SecurityPageName.artifacts);
      expect(artifactsLink?.path).toBe(getEventFiltersListPath());
    });
  });

  describe('RBAC checks', () => {
    it('should NOT return policies if `canReadPolicyManagement` is `false`', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadPolicyManagement: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });

      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.policies, SecurityPageName.cloudDefendPolicies).links?.map(
          (l) => l.id
        )
      );
    });

    it('should hide `Script library` for user without `canReadScriptsLibrary` privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadScriptsLibrary: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.scriptLibrary));
    });
  });

  describe('Endpoint List', () => {
    it('should return all but endpoints link when no Endpoint List READ access', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointList: false,
        })
      );
      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
        ...allowedExperimentalValues,
      });
      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.endpoints).links?.map((l) => l.id)
      );
    });
  });
});
