/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';
import { i18nStrings } from '../i18n_strings';

export interface LaunchpadNavigationTreeOptions {
  hasAiValueAccess?: boolean;
  sideNavVersion?: 'v1' | 'v2';
}

export const createLaunchpadNavigationTree = (
  options: LaunchpadNavigationTreeOptions = {}
): NodeDefinition => {
  const { hasAiValueAccess = false, sideNavVersion = 'v1' } = options;

  const children: NodeDefinition['children'] = [
    {
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      renderAs: 'item' as const,
    },
  ];

  // Add AI Value link only if user has access
  if (hasAiValueAccess) {
    children.push({
      id: SecurityPageName.aiValue,
      link: securityLink(SecurityPageName.aiValue),
      renderAs: 'item' as const,
    });
  }

  // If user doesn't have AI Value access, return just the landing page item
  if (!hasAiValueAccess) {
    return {
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      renderAs: 'item',
      icon: 'launch',
      iconV2: 'launch',
      sideNavVersion: 'v1',
    };
  }

  // If user has AI Value access, return the full panel opener
  return {
    id: SecurityGroupName.launchpad,
    title:
      sideNavVersion === 'v2'
        ? i18nStrings.launchPad.title
        : SecurityLinkGroup[SecurityGroupName.launchpad].title,
    renderAs: 'panelOpener',
    icon: 'launch',
    iconV2: 'launch',
    sideNavVersion,
    children: [{ children }],
  };
};
