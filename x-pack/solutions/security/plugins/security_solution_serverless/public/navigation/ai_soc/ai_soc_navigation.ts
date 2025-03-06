/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppDeepLinkId,
  GroupDefinition,
  NavigationTreeDefinition,
} from '@kbn/core-chrome-browser';

import type { WritableDraft } from 'immer/dist/internal';
import { ExternalPageName, SecurityPageName } from '@kbn/security-solution-navigation';
import { AiForTheSocIcon } from './icons';
import { filterFromWhitelist, moveToAnotherSection } from './utils';
import { type SecurityProductTypes } from '../../../common/config';
import { ProductLine, ProductTier } from '../../../common/product';
import { knowledgeSourceLink } from './links';

const shouldUseAINavigation = (productTypes: SecurityProductTypes) => {
  return productTypes.some((productType) => productType.product_line === ProductLine.aiSoc);
};
const isAIStandalone = (productTypes: SecurityProductTypes) => {
  return (
    productTypes.length === 1 &&
    productTypes[0].product_line === ProductLine.aiSoc &&
    productTypes[0].product_tier === ProductTier.searchAiLake
  );
};

const aiGroup: GroupDefinition<AppDeepLinkId, string, string> = {
  type: 'navGroup',
  id: 'security_solution_ai_nav',
  title: 'AI for SOC',
  icon: AiForTheSocIcon,
  breadcrumbStatus: 'hidden',
  defaultIsCollapsed: false,
  isCollapsible: false,
  children: [],
};
// Elements we want to show in AI for SOC navigation
// This is a temporary solution until we figure out a way to handle Upselling with new Tier
const whitelist = [
  ExternalPageName.managementKnowledgeSources,
  SecurityPageName.case,
  SecurityPageName.caseCreate,
  SecurityPageName.caseConfigure,
  SecurityPageName.attackDiscovery,
  ExternalPageName.discover,
];

// Apply AI for SOC navigation tree changes.
// The navigation tree received by parameter is generated at: x-pack/solutions/security/plugins/security_solution/public/app/solution_navigation/navigation_tree.ts
// An example of static navigation tree: x-pack/solutions/observability/plugins/observability/public/navigation_tree.ts
// This is a temporary solution until the "classic" navigation is deprecated and the "generated" navigationTree is replaced by a static navigationTree (probably multiple of them).
export const applyAiSocNavigation = (
  draft: WritableDraft<NavigationTreeDefinition<AppDeepLinkId>>,
  productTypes: SecurityProductTypes
): void => {
  if (!shouldUseAINavigation(productTypes)) {
    return;
  }

  const securityGroup = draft.body[0] as WritableDraft<
    GroupDefinition<AppDeepLinkId, string, string>
  >;

  // hardcode Knowledge Sources to exists in AI for SOC group
  securityGroup.children.push(knowledgeSourceLink);

  // Overwrite the children with only the elements available for AI for SOC navigation
  // Temporary solution until we have clarity how to procees with Upselling in the new Tier
  // (eg. Threat Intelligence couldn't be hidden)
  securityGroup.children = filterFromWhitelist(securityGroup.children, whitelist);

  if (isAIStandalone(productTypes)) {
    draft.body = [{ ...aiGroup, children: securityGroup.children }];
    return;
  }

  // The below will be removed from Security section and moved to AiSoc section
  const pageIdsToMove = [
    SecurityPageName.attackDiscovery,
    ExternalPageName.managementKnowledgeSources,
  ]; // Add more IDs as needed

  const attachedPages = moveToAnotherSection(securityGroup.children, pageIdsToMove);

  if (attachedPages.length) {
    securityGroup.appendHorizontalRule = true; // does not seem to work :( talk with sharedUx team
    draft.body.push({ ...aiGroup, children: attachedPages });
  }
};
