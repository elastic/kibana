/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_FLYOUT } from '@kbn/security-solution-plugin/cypress/screens/alerts_details';
import { createRule } from '@kbn/security-solution-plugin/cypress/tasks/api_calls/rules';
import { cleanKibana } from '@kbn/security-solution-plugin/cypress/tasks/common';
import { waitForAlertsToPopulate } from '@kbn/security-solution-plugin/cypress/tasks/create_new_rule';
import { login, visitWithoutDateRange } from '@kbn/security-solution-plugin/cypress/tasks/login';
import { refreshPage } from '@kbn/security-solution-plugin/cypress/tasks/security_header';
import { getNewRule } from '@kbn/security-solution-plugin/cypress/objects/rule';
import { ALERTS_URL } from '@kbn/security-solution-plugin/cypress/urls/navigation';
import {
  expandAlertTableCellValue,
  openUserDetailsFlyout,
  scrollAlertTableColumnIntoView,
} from '@kbn/security-solution-plugin/cypress/tasks/alerts';
import { USER_COLUMN } from '@kbn/security-solution-plugin/cypress/screens/alerts';

describe('user details flyout', () => {
  beforeEach(() => {
    cleanKibana();
    login();
  });

  it('shows user detail flyout from alert table', () => {
    visitWithoutDateRange(ALERTS_URL);
    createRule(getNewRule({ query: 'user.name:*' }));
    refreshPage();
    waitForAlertsToPopulate();

    scrollAlertTableColumnIntoView(USER_COLUMN);
    expandAlertTableCellValue(USER_COLUMN);
    openUserDetailsFlyout();

    cy.get(ALERT_FLYOUT).should('be.visible');
  });
});
