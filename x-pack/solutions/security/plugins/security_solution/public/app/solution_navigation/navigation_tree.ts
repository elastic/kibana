/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { partition } from 'lodash/fp';
import type {
  AppDeepLinkId,
  NodeDefinition,
  NavigationTreeDefinition,
  RootNavigationItemDefinition,
} from '@kbn/core-chrome-browser';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import {
  isSeparatorLinkCategory,
  isTitleLinkCategory,
  isAccordionLinkCategory,
} from '@kbn/security-solution-navigation';
import type { SolutionPageName, SolutionLinkCategory, SolutionNavLink } from '../../common/links';
import {
  getNavLinkIdFromSolutionPageName,
  isBreadcrumbHidden,
  isSideNavItem,
  isSideNavStatusHidden,
} from './util';
import { SOLUTION_NAME } from '../../common/translations';

export const formatNavigationTree = (
  solutionNavLinks: SolutionNavLink[],
  bodyCategories: Readonly<SolutionLinkCategory[]>,
  footerCategories: Readonly<SolutionLinkCategory[]>
): NavigationTreeDefinition => {
  const [footerNavItems, bodyNavItems] = partition('isFooterLink', solutionNavLinks);
  const bodyChildren = addMainLinksPanelOpenerProp(
    formatNodesFromLinks(bodyNavItems, bodyCategories, [])
  );
  return {
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_nav',
        title: SOLUTION_NAME,
        icon: 'logoSecurity',
        breadcrumbStatus: 'hidden',
        defaultIsCollapsed: false,
        children: bodyChildren,
        isCollapsible: false,
      },
    ],
    footer: formatFooterNodesFromLinks(footerNavItems, footerCategories),
  };
};

// Body

const formatNodesFromLinks = (
  solutionNavLinks: SolutionNavLink[],
  parentCategories: Readonly<Array<LinkCategory<SolutionPageName>>>,
  ids: SolutionPageName[]
): NodeDefinition[] => {
  const nodes: NodeDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      nodes.push(...formatNodesFromLinksWithCategory(solutionNavLinks, category, ids));
    }, []);
  } else {
    nodes.push(...formatNodesFromLinksWithoutCategory(solutionNavLinks, ids));
  }
  return nodes;
};

const formatNodesFromLinksWithCategory = (
  solutionNavLinks: SolutionNavLink[],
  category: LinkCategory<SolutionPageName>,
  ids: SolutionPageName[]
): NodeDefinition[] => {
  if (!category?.linkIds) {
    return [];
  }

  if (category.linkIds) {
    const children = category.linkIds.reduce<NodeDefinition[]>((acc, linkId) => {
      const solutionNavLink = solutionNavLinks.find(({ id }) => id === linkId);
      if (solutionNavLink != null) {
        acc.push(createNodeFromSolutionNavLink(solutionNavLink, ids));
      }
      return acc;
    }, []);
    if (!children.length) {
      return [];
    }

    const id = isTitleLinkCategory(category) ? getCategoryIdFromLabel(category.label) : undefined;

    return [
      {
        id,
        ...(isTitleLinkCategory(category) && { title: category.label }),
        breadcrumbStatus: 'hidden',
        children,
      },
    ];
  }
  return [];
};

const formatNodesFromLinksWithoutCategory = (
  solutionNavLinks: SolutionNavLink[],
  ids: SolutionPageName[]
): NodeDefinition[] => {
  return solutionNavLinks.map((solutionNavLink) =>
    createNodeFromSolutionNavLink(solutionNavLink, ids)
  );
};

const createNodeFromSolutionNavLink = (
  solutionNavLink: SolutionNavLink,
  parentIds: SolutionPageName[]
): NodeDefinition => {
  const { id, title, links, categories, disabled } = solutionNavLink;
  const ids = parentIds.concat(id);
  const link = getNavLinkIdFromSolutionPageName(id);
  const node: NodeDefinition = {
    id,
    link: link as AppDeepLinkId,
    title,
    ...((isSideNavStatusHidden(ids) || disabled) && { sideNavStatus: 'hidden' }),
    ...(isBreadcrumbHidden(id) && { breadcrumbStatus: 'hidden' }),
    ...(isSideNavItem(ids) && { renderAs: 'item' }),
  };
  if (links?.length) {
    node.children = formatNodesFromLinks(links, categories ?? [], ids);
  }
  return node;
};

// Footer

const formatFooterNodesFromLinks = (
  solutionNavLinks: SolutionNavLink[],
  parentCategories?: Readonly<Array<LinkCategory<SolutionPageName>>>
): RootNavigationItemDefinition[] => {
  const nodes: RootNavigationItemDefinition[] = [];
  if (parentCategories?.length) {
    parentCategories.forEach((category) => {
      if (isSeparatorLinkCategory(category)) {
        nodes.push(
          ...category.linkIds.reduce<RootNavigationItemDefinition[]>((acc, linkId) => {
            const solutionNavLink = solutionNavLinks.find(({ id }) => id === linkId);
            if (solutionNavLink != null) {
              acc.push({
                type: 'navItem',
                link: getNavLinkIdFromSolutionPageName(solutionNavLink.id) as AppDeepLinkId,
                title: solutionNavLink.title,
                icon: solutionNavLink.sideNavIcon,
              });
            }
            return acc;
          }, [])
        );
      }
      if (isAccordionLinkCategory(category)) {
        nodes.push({
          type: 'navGroup',
          id: getCategoryIdFromLabel(category.label),
          title: category.label,
          icon: category.iconType,
          breadcrumbStatus: 'hidden',
          children:
            category.linkIds?.reduce<NodeDefinition[]>((acc, linkId) => {
              const solutionNavLink = solutionNavLinks.find(({ id }) => id === linkId);
              if (solutionNavLink != null) {
                acc.push({
                  title: solutionNavLink.title,
                  link: getNavLinkIdFromSolutionPageName(solutionNavLink.id) as AppDeepLinkId,
                });
              }
              return acc;
            }, []) ?? [],
        });
      }
    }, []);
  }
  return nodes;
};

// Utils

const getCategoryIdFromLabel = (label: string): string =>
  `category-${label.toLowerCase().replace(' ', '_')}`;

/**
 * Adds the `renderAs: 'panelOpener'` prop to the main links that have children
 * This function expects all main links to be in nested groups to add the separation between them.
 * If these "separator" groups change this function will need to be updated.
 */
const addMainLinksPanelOpenerProp = (nodes: NodeDefinition[]): NodeDefinition[] =>
  nodes.map((node): NodeDefinition => {
    if (node.children?.length) {
      return {
        ...node,
        children: node.children.map((child) => ({
          ...child,
          ...(child.children && { renderAs: 'panelOpener' }),
        })),
      };
    }
    return node;
  });
