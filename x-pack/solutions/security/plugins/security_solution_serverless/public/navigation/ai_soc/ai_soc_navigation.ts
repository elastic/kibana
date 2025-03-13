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
import { alertSummaryLink } from './links';
import { AiForTheSocIcon } from './icons';
import { filterFromWhitelist } from './utils';
import { type SecurityProductTypes } from '../../../common/config';
import { ProductLine } from '../../../common/product';

const shouldUseAINavigation = (productTypes: SecurityProductTypes) => {
  return productTypes.some((productType) => productType.product_line === ProductLine.aiSoc);
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
  SecurityPageName.case,
  SecurityPageName.caseCreate,
  SecurityPageName.caseConfigure,
  SecurityPageName.alertSummary,
  SecurityPageName.attackDiscovery,
  ExternalPageName.discover,
  SecurityPageName.mlLanding,
];

// Apply AI for SOC navigation tree changes.
// The navigation tree received by parameter is generated at: x-pack/solutions/security/plugins/security_solution/public/app/solution_navigation/navigation_tree.ts
// An example of static navigation tree: x-pack/solutions/observability/plugins/observability/public/navigation_tree.ts

// !! This is a temporary solution until the "classic" navigation is deprecated and the "generated" navigationTree is replaced by a static navigationTree (probably multiple of them).
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

  // hardcode elements existing only in AI for SOC group
  securityGroup.children.push(alertSummaryLink);
  // securityGroup.children.push(knowledgeSourceLink);

  // Overwrite the children with only the elements available for AI for SOC navigation
  // Temporary solution until we have clarity how to proceed with Upselling in the new Tier
  // (eg. Threat Intelligence couldn't be hidden)
  securityGroup.children = filterFromWhitelist(securityGroup.children, whitelist);

  draft.body = [{ ...aiGroup, children: securityGroup.children }];
};
