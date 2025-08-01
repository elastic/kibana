/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUCCESS_TOASTER_HEADER } from '../../screens/alerts_detection_rules';
import { INSTALL_SINGLE_RULE_BUTTON } from '../../screens/install_prebuilt_rules';
import { getRuleRow } from '../alerts_detection_rules';

/**
 * Installs a single prebuilt rule by clicking the install button
 * in the rule's table row on Add Rules page
 */
export const installSinglePrebuiltRule = (ruleName: string) => {
  getRuleRow(ruleName).find(INSTALL_SINGLE_RULE_BUTTON).click();

  cy.get(SUCCESS_TOASTER_HEADER).should('have.text', '1 rule installed successfully');

  // Wait for the success toaster to disappear
  cy.get(SUCCESS_TOASTER_HEADER).should('not.exist');
};
