/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLaunchpadNavigationTree } from './security_launchpad_navigation_tree';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';

// Mock the dependencies
jest.mock('../constants', () => ({
  SecurityPageName: {
    landing: 'landing',
    aiValue: 'aiValue',
  },
  SecurityGroupName: {
    launchpad: 'securityGroup:launchpad',
  },
}));

jest.mock('../link_groups', () => ({
  SecurityLinkGroup: {
    'securityGroup:launchpad': {
      title: 'Security launchpad',
    },
  },
}));

jest.mock('../links', () => ({
  securityLink: jest.fn((pageName: string) => `securitySolutionUI:${pageName}`),
}));

describe('createLaunchpadNavigationTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when hasAiValueAccess is false', () => {
    it('returns a single item navigation tree for landing page', () => {
      const result = createLaunchpadNavigationTree({ hasAiValueAccess: false });

      expect(result).toEqual({
        id: SecurityPageName.landing,
        link: securityLink(SecurityPageName.landing),
        renderAs: 'item',
        icon: 'launch',
      });
    });

    it('returns a single item navigation tree when hasAiValueAccess is undefined', () => {
      const result = createLaunchpadNavigationTree({});

      expect(result).toEqual({
        id: SecurityPageName.landing,
        link: securityLink(SecurityPageName.landing),
        renderAs: 'item',
        icon: 'launch',
      });
    });

    it('returns a single item navigation tree when no options provided', () => {
      const result = createLaunchpadNavigationTree();

      expect(result).toEqual({
        id: SecurityPageName.landing,
        link: securityLink(SecurityPageName.landing),
        renderAs: 'item',
        icon: 'launch',
      });
    });
  });

  describe('when hasAiValueAccess is true', () => {
    it('returns a panel opener navigation tree with both landing and AI Value links', () => {
      const result = createLaunchpadNavigationTree({ hasAiValueAccess: true });

      expect(result).toEqual({
        id: SecurityGroupName.launchpad,
        title: SecurityLinkGroup[SecurityGroupName.launchpad].title,
        renderAs: 'panelOpener',
        icon: 'launch',
        children: [
          {
            id: SecurityPageName.landing,
            link: securityLink(SecurityPageName.landing),
            renderAs: 'item',
          },
          {
            id: SecurityPageName.aiValue,
            link: securityLink(SecurityPageName.aiValue),
            renderAs: 'item',
          },
        ],
      });
    });

    it('calls securityLink with correct page names', () => {
      createLaunchpadNavigationTree({ hasAiValueAccess: true });

      expect(securityLink).toHaveBeenCalledWith(SecurityPageName.landing);
      expect(securityLink).toHaveBeenCalledWith(SecurityPageName.aiValue);
    });
  });

  describe('securityLink function calls', () => {
    it('calls securityLink with landing page name when hasAiValueAccess is false', () => {
      createLaunchpadNavigationTree({ hasAiValueAccess: false });

      expect(securityLink).toHaveBeenCalledWith(SecurityPageName.landing);
      expect(securityLink).toHaveBeenCalledTimes(2);
    });

    it('calls securityLink with both page names when hasAiValueAccess is true', () => {
      createLaunchpadNavigationTree({ hasAiValueAccess: true });

      expect(securityLink).toHaveBeenCalledWith(SecurityPageName.landing);
      expect(securityLink).toHaveBeenCalledWith(SecurityPageName.aiValue);
      expect(securityLink).toHaveBeenCalledTimes(2);
    });
  });
});
