/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../../tags';

import { getNewRule } from '../../../../objects/rule';
import { RULES_MONITORING_TAB, RULE_NAME } from '../../../../screens/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';

describe('Rules table: links', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'rule1' }));
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('should render correct link for rule name - rules', () => {
    cy.get(RULE_NAME).first().click();
    cy.url().should('contain', 'rules/id/');
  });

  it('should render correct link for rule name - rule monitoring', () => {
    cy.get(RULES_MONITORING_TAB).click();
    cy.get(RULE_NAME).first().click();
    cy.url().should('contain', 'rules/id/');
  });
});
