/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS, DISCOVER, EXPLORE } from '../../screens/serverless_security_header';
import {
  EXPLORE_BREADCRUMB,
  HOSTS_BREADCRUMB,
} from '../../screens/serverless_security_breadcrumbs';

const navigateTo = (page: string) => {
  cy.get(page).click();
};

export const navigateToAlertsPageInServerless = () => {
  navigateTo(ALERTS);
};

export const navigateToDiscoverPageInServerless = () => {
  navigateTo(DISCOVER);
};

export const navigateToExplorePageInServerless = () => {
  navigateTo(EXPLORE);
};

export const navigateToHostsUsingBreadcrumb = () => {
  cy.get(HOSTS_BREADCRUMB).click();
};

export const navigateToExploreUsingBreadcrumb = () => {
  cy.get(EXPLORE_BREADCRUMB).click();
};
