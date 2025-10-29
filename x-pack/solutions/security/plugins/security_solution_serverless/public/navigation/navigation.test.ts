/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine, ProductTier } from '../../common/product';
import { mockServices } from '../common/services/__mocks__/services.mock';
import { registerSolutionNavigation } from './navigation';
import { createNavigationTree } from './navigation_tree';
import { createAiNavigationTree } from './ai_navigation/ai_navigation_tree';
import { SecurityPageName, SecurityGroupName } from '@kbn/security-solution-navigation';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

jest.mock('./navigation_tree');
jest.mock('./ai_navigation/ai_navigation_tree');

const mockedCreateNavigationTree = createNavigationTree as jest.Mock;
const mockedCreateAiNavigationTree = createAiNavigationTree as jest.Mock;

const mockedNavTree = {};
mockedCreateNavigationTree.mockResolvedValue(mockedNavTree);
const mockedAiNavTree = {};
mockedCreateAiNavigationTree.mockReturnValue(mockedAiNavTree);

describe('Security Side Nav', () => {
  const services = mockServices;
  const initNavigationSpy = jest.spyOn(services.serverless, 'initNavigation');

  beforeEach(() => {
    jest.clearAllMocks();
    initNavigationSpy.mockReset();
  });

  it('registers the navigation tree definition for serverless security', async () => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    await registerSolutionNavigation(services, []);

    expect(initNavigationSpy).toHaveBeenCalled();
    expect(mockedCreateNavigationTree).toHaveBeenCalledWith(services);
    expect(mockedCreateAiNavigationTree).not.toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toBe(mockedNavTree);
      },
    });
  });

  it('registers the navigation tree definition for serverless security with AI SOC', async () => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    await registerSolutionNavigation(services, [
      {
        product_line: 'ai_soc' as ProductLine,
        product_tier: 'search_ai_lake' as ProductTier,
      },
    ]);

    expect(initNavigationSpy).toHaveBeenCalled();
    expect(mockedCreateAiNavigationTree).toHaveBeenCalled();
    expect(mockedCreateNavigationTree).not.toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toBe(mockedAiNavTree);
      },
    });
  });
});

describe('Navigation Tree Role-Based Access', () => {
  const services = mockServices;
  const mockGetCurrentUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock for getCurrentUser
    services.security.authc.getCurrentUser = mockGetCurrentUser;
  });

  const findLaunchpadNode = (navigationTree: NavigationTreeDefinition) => {
    const footer = navigationTree.footer?.[0];
    if (footer && 'children' in footer) {
      return footer.children.find(
        (child) => 'id' in child && child.id === SecurityPageName.landing
      );
    }
    return undefined;
  };

  const findAiValueNode = (navigationTree: NavigationTreeDefinition) => {
    const footer = navigationTree.footer?.[0];
    if (footer && 'children' in footer) {
      const launchpadGroup = footer.children?.find(
        (child) => 'id' in child && child.id === SecurityGroupName.launchpad
      );
      if (launchpadGroup && launchpadGroup.children) {
        return launchpadGroup.children[0]?.children?.find(
          (child) => 'id' in child && child.id === SecurityPageName.aiValue
        );
      }
    }
    return undefined;
  };

  const createNavigationTreeWithUser = async (user: { roles?: string[] } | null) => {
    if (user === null) {
      mockGetCurrentUser.mockResolvedValue(null);
    } else {
      mockGetCurrentUser.mockResolvedValue(user);
    }
    const actualCreateNavigationTree = jest.requireActual('./navigation_tree').createNavigationTree;
    return actualCreateNavigationTree(services);
  };

  const createNavigationTreeWithError = async (error: Error) => {
    mockGetCurrentUser.mockRejectedValue(error);
    const actualCreateNavigationTree = jest.requireActual('./navigation_tree').createNavigationTree;
    return actualCreateNavigationTree(services);
  };

  const expectAiValueAccess = (navigationTree: NavigationTreeDefinition) => {
    const launchpadNode = findLaunchpadNode(navigationTree);
    const aiValueNode = findAiValueNode(navigationTree);

    expect(launchpadNode).toBeUndefined(); // Should not be a direct item
    expect(aiValueNode).toBeDefined(); // Should be in the launchpad group
    expect(aiValueNode?.id).toBe(SecurityPageName.aiValue);
  };

  const expectNoAiValueAccess = (navigationTree: NavigationTreeDefinition) => {
    const launchpadNode = findLaunchpadNode(navigationTree);
    const aiValueNode = findAiValueNode(navigationTree);

    expect(launchpadNode).toBeDefined(); // Should be a direct item
    expect(launchpadNode?.id).toBe(SecurityPageName.landing);
    expect(aiValueNode).toBeUndefined(); // Should not be in the launchpad group
  };

  it('grants AI value access to admin role', async () => {
    const navigationTree = await createNavigationTreeWithUser({ roles: ['admin', 'viewer'] });
    expectAiValueAccess(navigationTree);
  });

  it('grants AI value access to soc_manager role', async () => {
    const navigationTree = await createNavigationTreeWithUser({
      roles: ['soc_manager', 'analyst'],
    });
    expectAiValueAccess(navigationTree);
  });

  it('denies AI value access to other roles', async () => {
    const navigationTree = await createNavigationTreeWithUser({
      roles: ['viewer', 'analyst', 'editor'],
    });
    expectNoAiValueAccess(navigationTree);
  });

  it('denies AI value access when user has no roles', async () => {
    const navigationTree = await createNavigationTreeWithUser({ roles: [] });
    expectNoAiValueAccess(navigationTree);
  });

  it('denies AI value access when getCurrentUser fails', async () => {
    const navigationTree = await createNavigationTreeWithError(new Error('Authentication failed'));
    expectNoAiValueAccess(navigationTree);
  });

  it('denies AI value access when getCurrentUser returns null', async () => {
    const navigationTree = await createNavigationTreeWithUser(null);
    expectNoAiValueAccess(navigationTree);
  });

  it('denies AI value access when user object has no roles property', async () => {
    const navigationTree = await createNavigationTreeWithUser({});
    expectNoAiValueAccess(navigationTree);
  });
});
