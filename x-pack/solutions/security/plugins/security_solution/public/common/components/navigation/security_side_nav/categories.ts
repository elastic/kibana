/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LinkCategoryType, type SeparatorLinkCategory } from '@kbn/security-solution-navigation';
import { SecurityPageName } from '../../../../../common';

export const getNavCategories = (
  attacksAlertsAlignmentEnabled?: boolean
): SeparatorLinkCategory[] => {
  return [
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.dashboards],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [
        SecurityPageName.rulesLanding,
        attacksAlertsAlignmentEnabled ? SecurityPageName.alertDetections : SecurityPageName.alerts,
        SecurityPageName.attackDiscovery,
        SecurityPageName.cloudSecurityPostureFindings,
        SecurityPageName.case,
      ],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.siemMigrationsLanding],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [
        SecurityPageName.entityAnalyticsLanding,
        SecurityPageName.exploreLanding,
        SecurityPageName.timelines,
        SecurityPageName.threatIntelligence,
      ],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.assetInventory],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.siemReadiness],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [SecurityPageName.aiValue],
    },
  ];
};
