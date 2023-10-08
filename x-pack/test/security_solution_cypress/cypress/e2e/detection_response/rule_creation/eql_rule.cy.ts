/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEqlRule, getEqlSequenceRule } from '../../../objects/rule';

import { ALERTS_COUNT, ALERT_DATA_GRID } from '../../../screens/alerts';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
  confirmRuleDetailsAbout,
  confirmEQLRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  fillAboutRuleMinimumAndContinue,
  selectEqlRuleType,
} from '../../../tasks/rule_creation';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { CREATE_RULE_URL } from '../../../urls/navigation';

describe('Create EQL rules', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  describe('Detection rules, EQL', () => {
    const rule = getEqlRule();

    it('Creates and enables a new EQL rule', function () {
      cy.log('Filling define section');
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);

      cy.log('Filling about section');
      fillAboutRuleMinimumAndContinue(rule);

      cy.log('Filling schedule section');
      fillScheduleRuleAndContinue(rule);

      createAndEnableRule();

      cy.get(RULE_NAME_HEADER).should('contain', rule.name);

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.log('Confirm alerts are generated');
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/);
      cy.get(ALERT_DATA_GRID)
        .invoke('text')
        .then((text) => {
          expect(text).contains(rule.name);
          expect(text).contains(rule.severity);
          expect(text).contains(rule.risk_score);
        });
      confirmRuleDetailsAbout(rule);
      confirmEQLRuleDetailsDefinition(rule);
      confirmRuleDetailsSchedule(rule);
    });
  });

  describe('Sequence EQL', () => {
    const expectedNumberOfSequenceAlerts = '2 alerts';

    const rule = getEqlSequenceRule();

    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_big' });
    });
    afterEach(() => {
      cy.task('esArchiverUnload', 'auditbeat_big');
    });

    it('Creates and enables a new EQL rule with a sequence', function () {
      cy.log('Filling define section');
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);

      cy.log('Filling about section');
      fillAboutRuleMinimumAndContinue(rule);

      cy.log('Filling schedule section');
      fillScheduleRuleAndContinue(rule);

      createAndEnableRule();

      cy.get(RULE_NAME_HEADER).should('contain', rule.name);

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfSequenceAlerts);
      cy.get(ALERT_DATA_GRID)
        .invoke('text')
        .then((text) => {
          cy.log('ALERT_DATA_GRID', text);
          expect(text).contains(rule.name);
          expect(text).contains(rule.severity);
        });

      confirmRuleDetailsAbout(rule);
      confirmEQLRuleDetailsDefinition(rule);
      confirmRuleDetailsSchedule(rule);
    });
  });
});
