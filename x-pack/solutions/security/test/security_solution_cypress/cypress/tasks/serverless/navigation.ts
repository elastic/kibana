/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTS,
  clickServerlessChromeNavControl,
  DISCOVER,
  FOOTER_LAUNCHPAD,
  openNavigationPanelFor,
} from '../../screens/serverless_security_header';

const navigateTo = (page: string) => {
  openNavigationPanelFor(page);
  cy.get(page).click();
};

// The Launchpad footer button links to its first item (Getting started), so clicking it navigates
// there directly. Clicking the item inside its panel would be blocked by the app-leave prompt.
export const navigateToOnboardingPageInServerless = () => {
  clickServerlessChromeNavControl(FOOTER_LAUNCHPAD);
};

export const navigateToAlertsPageInServerless = () => {
  navigateTo(ALERTS);
};

export const navigateToDiscoverPageInServerless = () => {
  navigateTo(DISCOVER);
};
