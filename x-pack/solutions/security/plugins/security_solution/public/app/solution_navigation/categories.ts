/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LinkCategory, SeparatorLinkCategory } from '@kbn/security-solution-navigation';
import {
  ExternalPageName,
  LinkCategoryType,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import type { SolutionPageName } from '../../common/links';

export const CATEGORIES: Array<SeparatorLinkCategory<SolutionPageName>> = [
  {
    type: LinkCategoryType.separator,
    linkIds: [ExternalPageName.discover, SecurityPageName.dashboards],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [
      SecurityPageName.rulesLanding,
      SecurityPageName.alerts,
      SecurityPageName.attackDiscovery,
      SecurityPageName.cloudSecurityPostureFindings,
      SecurityPageName.case,
    ],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [
      SecurityPageName.investigations,
      SecurityPageName.threatIntelligence,
      SecurityPageName.exploreLanding,
    ],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.assetInventory],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.assets],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.mlLanding],
  },
  // --- Hidden links that need to be configured in the navigationTree for breadcrumbs ---
  {
    type: LinkCategoryType.separator,
    linkIds: [
      SecurityPageName.entityAnalyticsManagement,
      SecurityPageName.entityAnalyticsEntityStoreManagement,
    ], // Linked from the management cards landing.
  },
];

export const FOOTER_CATEGORIES: Array<LinkCategory<SolutionPageName>> = [
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.landing, ExternalPageName.devTools],
  },
  {
    type: LinkCategoryType.accordion,
    label: i18n.translate('xpack.securitySolution.navCategory.management.title', {
      defaultMessage: 'Management',
    }),
    iconType: 'gear',
    linkIds: [
      ExternalPageName.management,
      ExternalPageName.managementMonitoring,
      ExternalPageName.integrationsSecurity,
    ],
  },
];
