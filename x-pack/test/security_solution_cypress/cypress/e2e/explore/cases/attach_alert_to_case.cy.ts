/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';

import { expandFirstAlertActions } from '../../../tasks/alerts';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { ALERTS_URL } from '../../../urls/navigation';
import { ATTACH_ALERT_TO_CASE_BUTTON, TIMELINE_CONTEXT_MENU_BTN } from '../../../screens/alerts';
import { LOADING_INDICATOR } from '../../../screens/security_header';

const loadDetectionsPage = (role: SecurityRoleName) => {
  login(role);
  visitWithTimeRange(ALERTS_URL);
  waitForAlertsToPopulate();
};

describe('Alerts timeline', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'query_alert', useCreate: true, docsOnly: true });
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  context('Privileges: read only', { tags: ['@ess'] }, () => {
    beforeEach(() => {
      // ess only role
      loadDetectionsPage(ROLES.reader);
    });

    it('should not allow user with read only privileges to attach alerts to existing cases', () => {
      // Disabled actions for read only users are hidden, so the ... icon is not even shown
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });

    it('should not allow user with read only privileges to attach alerts to a new case', () => {
      // Disabled actions for read only users are hidden, so the ... icon is not even shown
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });
  });

  context('Privileges: can crud', () => {
    beforeEach(() => {
      loadDetectionsPage(ROLES.platform_engineer);
      cy.get(LOADING_INDICATOR).should('not.exist');
    });

    it('should allow a user with crud privileges to attach alerts to cases', () => {
      expandFirstAlertActions();
      cy.get(ATTACH_ALERT_TO_CASE_BUTTON).first().should('not.be.disabled');
    });
  });
});
