/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';

import { getNewRule } from '../../../../objects/rule';
import {
  clickAlertTag,
  openAlertTaggingBulkActionMenu,
  selectNumberOfAlerts,
  updateAlertTags,
} from '../../../../tasks/alerts';
import { createRule } from '../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  ALERTS_TABLE_ROW_LOADER,
  ALERT_TAGGING_CONTEXT_MENU_ITEM,
  SELECTED_ALERT_TAG,
  TAKE_ACTION_POPOVER_BTN,
  UNSELECTED_ALERT_TAG,
} from '../../../../screens/alerts';

const CANNOT_INTERACT_WITH_TAGS: SecurityRoleName[] = [ROLES.viewer];

const CAN_INTERACT_WITH_TAGS: SecurityRoleName[] = [
  ROLES.editor,
  ROLES.t1_analyst,
  ROLES.t2_analyst,
  // ROLES.t3_analyst,
  ROLES.threat_intelligence_analyst,
  ROLES.rule_author,
  ROLES.detections_admin,
  ROLES.soc_manager,
  ROLES.platform_engineer,
  // ROLES.endpoint_operations_analyst,
  ROLES.endpoint_policy_manager,
];

describe('Alert tagging privileges', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visitWithTimeRange(ALERTS_URL);
    cy.task('esArchiverLoad', { archiveName: 'endpoint' });
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    cy.task('esArchiverUnload', 'endpoint');
  });

  describe('have write privileges', () => {
    CAN_INTERACT_WITH_TAGS.forEach((role) => {
      it(`${role} can add and remove a tag using the alert bulk action menu`, () => {
        login(role);
        visitWithTimeRange(ALERTS_URL, { role });
        waitForAlertsToPopulate();

        // Add a tag to one alert
        selectNumberOfAlerts(1);
        openAlertTaggingBulkActionMenu();
        clickAlertTag('Duplicate');
        updateAlertTags();
        cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
        selectNumberOfAlerts(1);
        openAlertTaggingBulkActionMenu();
        cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
        // Remove tag from that alert
        clickAlertTag('Duplicate');
        updateAlertTags();
        cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
        selectNumberOfAlerts(1);
        openAlertTaggingBulkActionMenu();
        cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
      });
    });
  });

  describe('do not have privileges', () => {
    CANNOT_INTERACT_WITH_TAGS.forEach((role) => {
      it(`${role} cannot add and remove a tag using the alert bulk action menu`, () => {
        login(role);
        visitWithTimeRange(ALERTS_URL, { role });
        waitForAlertsToPopulate();

        // Add a tag to one alert
        selectNumberOfAlerts(1);
        cy.get(TAKE_ACTION_POPOVER_BTN).click();
        cy.get(ALERT_TAGGING_CONTEXT_MENU_ITEM).should('not.exist');
      });
    });
  });
});
