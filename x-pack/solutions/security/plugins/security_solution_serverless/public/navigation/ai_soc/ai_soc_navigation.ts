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
// import { ASSISTANT_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import { AiForTheSocIcon } from './icons';
import { findAndRemoveNodes } from './utils';
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

  if (isAIStandalone(productTypes)) {
    draft.body = [{ ...aiGroup, children: securityGroup.children }];
    return;
  }

  const pageIdsToAttach = [
    SecurityPageName.attackDiscovery,
    ExternalPageName.managementKnowledgeSources,
  ]; // Add more IDs as needed

  const attachedPages = findAndRemoveNodes(securityGroup.children, pageIdsToAttach);

  if (attachedPages.length) {
    securityGroup.appendHorizontalRule = true; // does not seem to work :( talk with sharedUx team
    draft.body.push({ ...aiGroup, children: attachedPages });
  }
};
