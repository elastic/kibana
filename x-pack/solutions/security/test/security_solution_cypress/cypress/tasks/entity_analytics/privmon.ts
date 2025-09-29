/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from '../navigation';
import { ADVANCED_SETTINGS_URL } from '../../urls/navigation';
import { OKTA_INTEGRATION_CARD } from '../../screens/entity_analytics/privileged_user_monitoring';

export const togglePrivilegedUserMonitoring = () => {
  visit(`${ADVANCED_SETTINGS_URL}?query=privilege+user`);
  cy.get(
    '[data-test-subj="management-settings-editField-securitySolution:enablePrivilegedUserMonitoring"]'
  ).click();
  cy.get('[data-test-subj="settings-save-button"]').click();
  cy.get('[data-test-subj="pageReloadButton"]').should('be.visible');
};

export const clickOktaCard = () => {
  cy.get(OKTA_INTEGRATION_CARD).click();
};
