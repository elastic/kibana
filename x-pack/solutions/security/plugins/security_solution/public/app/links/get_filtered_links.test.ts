/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the dependencies before imports
jest.mock('../../management/links', () => ({
  getManagementFilteredLinks: jest.fn(),
}));

import { getFilteredLinks } from './app_links';
import type { LinkItem } from '../../common/links/types';
import { createCoreStartMock } from '@kbn/core-lifecycle-browser-mocks/src/core_start.mock';
import type { StartPlugins } from '../../types';
import { getManagementFilteredLinks } from '../../management/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';

const mockGetManagementFilteredLinks = getManagementFilteredLinks as jest.MockedFunction<
  typeof getManagementFilteredLinks
>;

// Helper function to create mock link items
const createMockLinkItem = (overrides: Partial<LinkItem> = {}): LinkItem => ({
  id: SecurityPageName.administration,
  title: 'Test Link',
  path: '/test',
  ...overrides,
});

describe('getFilteredLinks', () => {
  const mockCore = createCoreStartMock();
  const mockPlugins = {} as StartPlugins;
  const mockManagementLinks = createMockLinkItem({
    id: SecurityPageName.administration,
    title: 'Management',
    path: '/management',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock uiSettings.get$ to return an observable that emits immediately
    mockCore.uiSettings.get$ = jest.fn().mockReturnValue(of(AIChatExperience.Classic));
  });

  it('returns filtered links including AI Value links', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(result).toContainEqual(expect.objectContaining({ id: SecurityPageName.aiValue }));
    expect(result).toContainEqual(mockManagementLinks);
    expect(mockGetManagementFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
  });

  it('includes all base links in the result', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    // Check that base links are included by checking the result has expected length
    expect(result.length).toBeGreaterThan(10);

    // Check specific links that we know should be present based on the actual output
    const resultIds = result.map((link) => link.id);
    expect(resultIds).toContain('dashboards');
    expect(resultIds).toContain('alerts');
    expect(resultIds).toContain('cases');
    expect(resultIds).toContain('configurations');
    expect(resultIds).toContain('ai_value'); // AI Value is now included statically
  });

  it('returns a frozen array', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(Object.isFrozen(result)).toBe(true);
  });

  it('calls management filter function with correct parameters', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

    await getFilteredLinks(mockCore, mockPlugins);

    expect(mockGetManagementFilteredLinks).toHaveBeenCalledTimes(1);
    expect(mockGetManagementFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
  });

  describe('`securitySolution:enableAlertsAndAttacksAlignment` setting', () => {
    it('includes correct base links in the result when setting is disabled', async () => {
      mockCore.uiSettings.get.mockReturnValue(false);
      mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

      const result = await getFilteredLinks(mockCore, mockPlugins);

      // Check that base links are included by checking the result has expected length
      expect(result.length).toBeGreaterThan(10);

      // Check specific links that we know should be present based on the actual output
      const resultIds = result.map((link) => link.id);
      expect(resultIds).toContain('dashboards');
      expect(resultIds).toContain('alerts');
      expect(resultIds).toContain('attack_discovery');
      expect(resultIds).toContain('cases');
      expect(resultIds).toContain('configurations');
      expect(resultIds).toContain('ai_value'); // AI Value is now included statically
    });

    it('includes all base links in the result when setting is enabled', async () => {
      mockCore.uiSettings.get.mockReturnValue(true);
      mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);

      const result = await getFilteredLinks(mockCore, mockPlugins);

      // Check that base links are included by checking the result has expected length
      expect(result.length).toBeGreaterThan(10);

      // Check specific links that we know should be present based on the actual output
      const resultIds = result.map((link) => link.id);
      expect(resultIds).toContain('dashboards');
      expect(resultIds).toContain('alert_detections');
      expect(resultIds).toContain('attack_discovery');
      expect(resultIds).toContain('cases');
      expect(resultIds).toContain('configurations');
      expect(resultIds).toContain('ai_value'); // AI Value is now included statically
    });
  });
});
