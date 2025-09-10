/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the dependencies before imports
jest.mock('../../reports/links', () => ({
  getAiValueFilteredLinks: jest.fn(),
}));

jest.mock('../../management/links', () => ({
  getManagementFilteredLinks: jest.fn(),
}));

import { getFilteredLinks } from './app_links';
import type { LinkItem } from '../../common/links/types';
import type { CoreStart } from '@kbn/core/public';
import type { StartPlugins } from '../../types';
import { getAiValueFilteredLinks } from '../../reports/links';
import { getManagementFilteredLinks } from '../../management/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

const mockGetAiValueFilteredLinks = getAiValueFilteredLinks as jest.MockedFunction<
  typeof getAiValueFilteredLinks
>;
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
  const mockCore = {} as CoreStart;
  const mockPlugins = {} as StartPlugins;
  const mockManagementLinks = createMockLinkItem({
    id: SecurityPageName.administration,
    title: 'Management',
    path: '/management',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filtered links with AI Value links when available', async () => {
    const mockAiValueLinks = createMockLinkItem({
      id: SecurityPageName.aiValue,
      title: 'AI Value',
      path: '/ai-value',
    });
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(mockAiValueLinks);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(result).toContainEqual(mockAiValueLinks);
    expect(result).toContainEqual(mockManagementLinks);
    expect(mockGetManagementFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
    expect(mockGetAiValueFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
  });

  it('returns filtered links without AI Value links when null', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(null);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(result).not.toContainEqual(expect.objectContaining({ id: SecurityPageName.aiValue }));
    expect(result).toContainEqual(mockManagementLinks);
    expect(mockGetManagementFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
    expect(mockGetAiValueFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
  });

  it('returns filtered links without AI Value links when undefined', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(undefined as unknown as LinkItem | null);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(result).not.toContainEqual(expect.objectContaining({ id: SecurityPageName.aiValue }));
    expect(result).toContainEqual(mockManagementLinks);
  });

  it('includes all base links in the result', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(null);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    // Check that base links are included by checking the result has expected length
    expect(result.length).toBeGreaterThan(10);

    // Check specific links that we know should be present based on the actual output
    const resultIds = result.map((link) => link.id);
    expect(resultIds).toContain('dashboards');
    expect(resultIds).toContain('alerts');
    expect(resultIds).toContain('cases');
    expect(resultIds).toContain('configurations');
  });

  it('returns a frozen array', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(null);

    const result = await getFilteredLinks(mockCore, mockPlugins);

    expect(Object.isFrozen(result)).toBe(true);
  });

  it('calls both filter functions with correct parameters', async () => {
    mockGetManagementFilteredLinks.mockResolvedValue(mockManagementLinks);
    mockGetAiValueFilteredLinks.mockResolvedValue(null);

    await getFilteredLinks(mockCore, mockPlugins);

    expect(mockGetManagementFilteredLinks).toHaveBeenCalledTimes(1);
    expect(mockGetManagementFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
    expect(mockGetAiValueFilteredLinks).toHaveBeenCalledTimes(1);
    expect(mockGetAiValueFilteredLinks).toHaveBeenCalledWith(mockCore, mockPlugins);
  });
});
