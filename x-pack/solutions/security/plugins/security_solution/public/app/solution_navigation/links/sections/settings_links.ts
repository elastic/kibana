/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName, ExternalPageName } from '@kbn/security-solution-navigation';
import type { LinkItem } from '../../../../common/links/types';
import type { SolutionNavLink } from '../../../../common/links';
import * as i18n from './settings_translations';

const ENTITY_ANALYTICS_LINKS = [
  SecurityPageName.entityAnalyticsManagement,
  SecurityPageName.entityAnalyticsEntityStoreManagement,
];

export const createSettingsLinksFromManage = (manageLink: LinkItem): LinkItem[] => {
  const entityAnalyticsLinks =
    manageLink.links?.filter(({ id }) => ENTITY_ANALYTICS_LINKS.includes(id)) ?? [];

  return entityAnalyticsLinks.map((link) => ({
    ...link,
    sideNavDisabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
  }));
};

export const settingsNavLinks: SolutionNavLink[] = [
  {
    id: ExternalPageName.management,
    title: i18n.MANAGEMENT_TITLE,
    isFooterLink: true,
  },
  {
    id: ExternalPageName.managementMonitoring,
    title: i18n.MONITORING_TITLE,
    isFooterLink: true,
  },
  {
    id: ExternalPageName.integrationsSecurity,
    title: i18n.INTEGRATIONS_TITLE,
    isFooterLink: true,
  },
  {
    id: ExternalPageName.maps,
    title: i18n.MAPS_TITLE,
    description: i18n.MAPS_DESCRIPTION,
    landingIcon: 'graphApp',
    disabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
  },
  {
    id: ExternalPageName.visualize,
    title: i18n.VISUALIZE_TITLE,
    description: i18n.VISUALIZE_DESCRIPTION,
    landingIcon: 'visualizeApp',
    disabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
  },
];
