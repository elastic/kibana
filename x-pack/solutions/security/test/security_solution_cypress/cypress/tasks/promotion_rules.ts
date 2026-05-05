/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from './navigation';
import { installIntegration } from './integrations';
import { INTEGRATION_CARD } from '../screens/integrations';
import { BASIC_RULES_TAB } from '../screens/promotion_rules';
import {
  CONFIGURATIONS_INTEGRATIONS_URL,
  CONFIGURATIONS_BASIC_RULES_URL_FRAGMENT,
} from '../urls/navigation';
import { MODAL_CONFIRMATION_CANCEL_BTN } from '../screens/alerts_detection_rules';

export const installIntegrationFromBrowsePage = (integrationName: string) => {
  visit(CONFIGURATIONS_INTEGRATIONS_URL);
  cy.get(INTEGRATION_CARD(integrationName)).click();
  installIntegration();
  cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();
};

export const visitPromotionRulesTab = () => {
  visit(CONFIGURATIONS_INTEGRATIONS_URL);
  cy.get(BASIC_RULES_TAB).click();
  cy.url().should('include', CONFIGURATIONS_BASIC_RULES_URL_FRAGMENT);
};
