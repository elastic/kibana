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
  NodeDefinition,
} from '@kbn/core-chrome-browser';

import type { WritableDraft } from 'immer/dist/internal';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { remove } from 'lodash';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { ProductLine } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';

const shouldUseAINavigation = (productTypes: SecurityProductTypes) => {
  return productTypes.some((productType) => productType.product_line === ProductLine.ai);
};
const isAIStandalone = (productTypes: SecurityProductTypes) => {
  return !productTypes.some((productType) => productType.product_line === ProductLine.security);
};

const aiGroup: GroupDefinition<AppDeepLinkId, string, string> = {
  type: 'navGroup',
  id: 'security_solution_ai_nav',
  title: 'AI for SOC',
  icon: AssistantIcon,
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

  if (isAIStandalone(productTypes)) {
    draft.body = [{ ...aiGroup, children: securityGroup.children }];
    return;
  }

  const [attachDiscovery] = securityGroup.children.reduce<Array<NodeDefinition<AppDeepLinkId>>>(
    (nodes, category) => {
      const [attachDiscoveryNode] = remove(category.children ?? [], {
        id: SecurityPageName.attackDiscovery,
      });
      if (attachDiscoveryNode) {
        nodes.push(attachDiscoveryNode);
      }
      return nodes;
    },
    []
  );

  if (attachDiscovery) {
    securityGroup.appendHorizontalRule = true; // does not seem to work :( talk with sharedUx team
    draft.body.push({ ...aiGroup, children: [attachDiscovery] });
  }
};
