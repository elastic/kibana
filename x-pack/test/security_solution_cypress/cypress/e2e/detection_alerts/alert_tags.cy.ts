/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';

import { getNewRule } from '../../objects/rule';
import {
  clickAlertTag,
  openAlertTaggingBulkActionMenu,
  selectNumberOfAlerts,
  updateAlertTags,
} from '../../tasks/alerts';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  ALERTS_TABLE_ROW_LOADER,
  MIXED_ALERT_TAG,
  SELECTED_ALERT_TAG,
  UNSELECTED_ALERT_TAG,
} from '../../screens/alerts';

describe('Alert tagging', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverResetKibana');
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    cy.task('esArchiverLoad', 'endpoint');
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    cy.task('esArchiverUnload', 'endpoint');
  });

  it('Add and remove a tag using the alert bulk action menu', () => {
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

  it('Add a tag using the alert bulk action menu with mixed state', () => {
    // Add tag to one alert first
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    // Then add tags to both alerts
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(MIXED_ALERT_TAG).contains('Duplicate');
    clickAlertTag('Duplicate');
    updateAlertTags();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Remove a tag using the alert bulk action menu with mixed state', () => {
    // Add tag to one alert first
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    waitForAlertsToPopulate();
    // Then remove tags from both alerts
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(MIXED_ALERT_TAG).contains('Duplicate');
    clickAlertTag('Duplicate');
    clickAlertTag('Duplicate'); // Clicking twice will return to unselected state
    updateAlertTags();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });
});
