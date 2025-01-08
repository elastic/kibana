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
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

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

    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());
    expect(filteredLinks).toEqual(links);
  });

  it('should not return any endpoint management link for user with all sub-feature privileges when no user authz', async () => {
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins(true));
    expect(filteredLinks).toEqual(
      getLinksWithout(
        SecurityPageName.blocklist,
        SecurityPageName.endpoints,
        SecurityPageName.eventFilters,
        SecurityPageName.hostIsolationExceptions,
        SecurityPageName.policies,
        SecurityPageName.responseActionsHistory,
        SecurityPageName.trustedApps,
        SecurityPageName.cloudDefendPolicies
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
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.responseActionsHistory));
    });
  });

  describe('Host Isolation Exception', () => {
    const apiVersion = '2023-10-31';
    it('should return HIE if user has access permission (licensed)', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({ canAccessHostIsolationExceptions: true })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(links);
      expect(fakeHttpServices.get).not.toHaveBeenCalled();
    });

    it('should NOT return HIE if the user has no HIE permission', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canAccessHostIsolationExceptions: false,
          canReadHostIsolationExceptions: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
      expect(fakeHttpServices.get).not.toHaveBeenCalled();
    });

    it('should NOT return HIE if user has read permission (no license) and NO HIE entries exist', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canAccessHostIsolationExceptions: false,
          canReadHostIsolationExceptions: true,
        })
      );

      fakeHttpServices.get.mockResolvedValue({ total: 0 });

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
      expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        version: apiVersion,
        query: expect.objectContaining({
          list_id: [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id],
        }),
      });
    });

    it('should return HIE if user has read permission (no license) but HIE entries exist', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canAccessHostIsolationExceptions: false,
          canReadHostIsolationExceptions: true,
        })
      );

      fakeHttpServices.get.mockResolvedValue({ total: 100 });

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(links);
      expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        version: apiVersion,
        query: expect.objectContaining({
          list_id: [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id],
        }),
      });
    });
  });

  describe('RBAC checks', () => {
    it('should return all links for user with all sub-feature privileges', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(links);
    });

    it('should hide Trusted Applications for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadTrustedApplications: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.trustedApps));
    });

    it('should hide Event Filters for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEventFilters: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.eventFilters));
    });

    it('should hide Blocklist for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadBlocklist: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.blocklist));
    });

    it('should NOT return policies if `canReadPolicyManagement` is `false`', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadPolicyManagement: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins());

      expect(filteredLinks).toEqual(
        getLinksWithout(SecurityPageName.policies, SecurityPageName.cloudDefendPolicies)
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
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.endpoints));
    });
  });
});
