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
import { getManagementFilteredLinks, links } from './links';
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

  it('should return all links for user with all sub-feature privileges', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(), {
      experimentalFeatures: { ...allowedExperimentalValues },
    });
    expect(filteredLinks.links?.map((l) => l.id)).toEqual(links.links?.map((l) => l.id));
    const artifactsLink = filteredLinks.links?.find((l) => l.id === SecurityPageName.artifacts);
    expect(artifactsLink?.path).toBeDefined();
  });

  it('should not return any endpoint management link for user with all sub-feature privileges when no user authz', async () => {
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(true));
    expect(filteredLinks).toEqual(
      getLinksWithout(
        SecurityPageName.artifacts,
        SecurityPageName.endpoints,
        SecurityPageName.policies,
        SecurityPageName.cloudDefendPolicies,
        SecurityPageName.responseActionsHistory,
        SecurityPageName.scriptsLibrary
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

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());
      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.responseActionsHistory).links?.map((l) => l.id)
      );
    });
  });

  describe('Artifacts (single link, canReadAnyArtifact)', () => {
    it('should hide Artifacts when user has no artifact privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointExceptions: false,
          canReadTrustedApplications: false,
          canReadTrustedDevices: false,
          canReadEventFilters: false,
          canReadHostIsolationExceptions: false,
          canReadBlocklist: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

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
          canReadBlocklist: true,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      const artifactsLink = filteredLinks.links?.find((l) => l.id === SecurityPageName.artifacts);
      expect(artifactsLink).toBeDefined();
      expect(artifactsLink?.path).toBeDefined();
    });
  });

  describe('RBAC checks', () => {
    it('should NOT return policies if `canReadPolicyManagement` is `false`', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadPolicyManagement: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.policies, SecurityPageName.cloudDefendPolicies).links?.map(
          (l) => l.id
        )
      );
    });

    it('should hide Scripts library for user without `canReadScriptsLibrary` privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadScriptsLibrary: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.scriptsLibrary).links?.map((l) => l.id)
      );
    });
  });

  describe('Endpoint List', () => {
    it('should return all but endpoints link when no Endpoint List READ access', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointList: false,
        })
      );
      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());
      expect(filteredLinks.links?.map((l) => l.id)).toEqual(
        getLinksWithout(SecurityPageName.endpoints).links?.map((l) => l.id)
      );
    });
  });
});
