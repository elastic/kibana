/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  applicationLinksUpdater,
  type ApplicationLinksUpdateParams,
} from './application_links_updater';
import type { AppLinkItems, LinkItem } from '../../common/links/types';
import { hasCapabilities, existCapabilities } from '../../common/lib/capabilities';
import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import type { ExperimentalFeatures, SecurityPageName } from '../../../common';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';

vi.mock('../../common/lib/capabilities', () => {
      const mocked = {
      hasCapabilities: vi.fn(),
      existCapabilities: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockHasCapabilities = hasCapabilities as Mock;
const mockExistCapabilities = existCapabilities as Mock;

// Allow access to private method just for testing
const appLinks = applicationLinksUpdater as unknown as {
  processAppLinks: (links: AppLinkItems, params: ApplicationLinksUpdateParams) => LinkItem[];
};

const link: LinkItem = {
  id: 'test' as SecurityPageName,
  path: '/app/test',
  title: 'Test',
};

describe('ApplicationLinksUpdater', () => {
  const createMockParams = (
    overrides: Partial<ApplicationLinksUpdateParams> = {}
  ): ApplicationLinksUpdateParams => ({
    capabilities: {} as Capabilities,
    experimentalFeatures: {} as ExperimentalFeatures,
    uiSettingsClient: {
      get: vi.fn().mockReturnValue(true),
    } as unknown as IUiSettingsClient,
    license: {
      hasAtLeast: vi.fn().mockReturnValue(true),
    } as unknown as ILicense,
    upselling: {
      isPageUpsellable: vi.fn().mockReturnValue(false),
    } as unknown as UpsellingService,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockHasCapabilities.mockReturnValue(true);
    mockExistCapabilities.mockReturnValue(true);
  });

  describe('processAppLinks', () => {
    it('should include a link when all links are allowed', () => {
      const params = createMockParams();
      const result = appLinks.processAppLinks([link], params);

      expect(result).toEqual([link]);
    });

    it('should exclude a link when capabilities do not exist and not upsellable', () => {
      mockExistCapabilities.mockReturnValue(false);

      const links: AppLinkItems = [{ ...link, capabilities: ['admin'] }];

      const params = createMockParams();
      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([]);
    });

    it('should mark link as unavailable when capabilities do not exist and it is upsellable', () => {
      mockExistCapabilities.mockReturnValue(false);

      const links: AppLinkItems = [{ ...link, capabilities: ['advanced_access'] }];

      const params = createMockParams({
        upselling: { isPageUpsellable: vi.fn(() => true) } as unknown as UpsellingService,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([expect.objectContaining({ ...link, unavailable: true })]);
    });

    it('should mark link as unavailable when license is insufficient and it is upsellable', () => {
      const links: AppLinkItems = [
        { ...link, licenseType: 'enterprise' as LicenseType, capabilities: ['advanced_access'] },
      ];

      const params = createMockParams({
        license: { hasAtLeast: vi.fn(() => false) } as unknown as ILicense,
        upselling: { isPageUpsellable: vi.fn(() => true) } as unknown as UpsellingService,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([expect.objectContaining({ ...link, unavailable: true })]);
    });

    it('should mark a link as unauthorized if capabilities exist but requirements are not met', () => {
      mockExistCapabilities.mockReturnValue(true);
      mockHasCapabilities.mockReturnValue(false);

      const links: AppLinkItems = [{ ...link, capabilities: ['advanced_access'] }];

      const params = createMockParams({
        upselling: { isPageUpsellable: vi.fn(() => true) } as unknown as UpsellingService,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([expect.objectContaining({ ...link, unauthorized: true })]);
    });

    it('should filter out a link based on uiSettingsClient', () => {
      const links: AppLinkItems = [{ ...link, uiSettingRequired: 'showBeta' }];

      const params = createMockParams({
        uiSettingsClient: { get: vi.fn(() => false) } as unknown as IUiSettingsClient,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([]);
    });

    it('should filter out links based on experimental features', () => {
      const links: AppLinkItems = [
        { ...link, experimentalKey: 'labsEnabled' as keyof ExperimentalFeatures },
      ];

      const params = createMockParams({
        experimentalFeatures: { labsEnabled: false } as unknown as ExperimentalFeatures,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([]);
    });

    it('should recurse and filter child links', () => {
      mockExistCapabilities.mockImplementation(
        (_caps, required) => required?.includes('read') ?? true
      );

      const links: AppLinkItems = [
        {
          id: 'parent' as SecurityPageName,
          path: '/app/parent',
          title: 'Parent',
          capabilities: ['read'],
          links: [
            {
              id: 'child-1' as SecurityPageName,
              title: 'Child 1',
              path: '/app/child-1',
              capabilities: ['read'],
            },
            {
              id: 'child-2' as SecurityPageName,
              title: 'Child 2',
              path: '/app/child-2',
              capabilities: ['admin'],
            },
          ],
        },
      ];

      const params = createMockParams({
        upselling: { isPageUpsellable: vi.fn(() => false) } as unknown as UpsellingService,
      });

      const result = appLinks.processAppLinks(links, params);

      expect(result).toEqual([
        expect.objectContaining({
          id: 'parent',
          links: [
            expect.objectContaining({
              id: 'child-1',
            }),
          ],
        }),
      ]);
    });
  });
});
