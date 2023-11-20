/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  HOST_RISK_HEADER_COLUMN,
  USER_RISK_HEADER_COLUMN,
  HOST_RISK_COLUMN,
  USER_RISK_COLUMN,
  ACTION_COLUMN,
  ALERTS_COUNT,
} from '../../screens/alerts';
import { ENRICHED_DATA_ROW } from '../../screens/alerts_details';

import { createRule } from '../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  expandFirstAlert,
  scrollAlertTableColumnIntoView,
  closeAlertFlyout,
} from '../../tasks/alerts';
import { disableExpandableFlyout } from '../../tasks/api_calls/kibana_advanced_settings';

import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';

import { ALERTS_URL } from '../../urls/navigation';
import { deleteRiskEngineConfiguration } from '../../tasks/api_calls/risk_engine';
import { enableRiskEngine } from '../../tasks/entity_analytics';

const CURRENT_HOST_RISK_LEVEL = 'Current host risk level';
const ORIGINAL_HOST_RISK_LEVEL = 'Original host risk level';

// FLAKY: https://github.com/elastic/kibana/issues/169154
describe.skip('Enrichment', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverUnload', 'risk_scores_new');
    cy.task('esArchiverUnload', 'risk_scores_new_updated');
    cy.task('esArchiverLoad', { archiveName: 'risk_users' });
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_users');
  });

  describe('Custom query rule', () => {
    describe('from legacy risk scores', () => {
      beforeEach(() => {
        disableExpandableFlyout();
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
        deleteAlertsAndRules();
        createRule(getNewRule({ rule_id: 'rule1' }));
        login();
        deleteRiskEngineConfiguration();
        visitWithTimeRange(ALERTS_URL);
        waitForAlertsToPopulate();
      });

      afterEach(() => {
        cy.task('esArchiverUnload', 'risk_hosts');
        cy.task('esArchiverUnload', 'risk_hosts_updated');
      });

      it('Should has enrichment fields from legacy risk', function () {
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .should('match', /^[1-9].+$/); // Any number of alerts
        cy.get(HOST_RISK_HEADER_COLUMN).contains('host.risk.calculated_level');
        cy.get(USER_RISK_HEADER_COLUMN).contains('user.risk.calculated_level');
        scrollAlertTableColumnIntoView(HOST_RISK_COLUMN);
        cy.get(HOST_RISK_COLUMN).contains('Low');
        scrollAlertTableColumnIntoView(USER_RISK_COLUMN);
        cy.get(USER_RISK_COLUMN).contains('Low');
        scrollAlertTableColumnIntoView(ACTION_COLUMN);
        expandFirstAlert();
        cy.get(ENRICHED_DATA_ROW).contains('Low');
        cy.get(ENRICHED_DATA_ROW).contains(CURRENT_HOST_RISK_LEVEL);
        cy.get(ENRICHED_DATA_ROW).contains('Critical').should('not.exist');
        cy.get(ENRICHED_DATA_ROW).contains(ORIGINAL_HOST_RISK_LEVEL).should('not.exist');

        closeAlertFlyout();
        cy.task('esArchiverUnload', 'risk_hosts');
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts_updated' });
        expandFirstAlert();
        cy.get(ENRICHED_DATA_ROW).contains('Critical');
        cy.get(ENRICHED_DATA_ROW).contains(ORIGINAL_HOST_RISK_LEVEL);
      });
    });

    describe('from new risk scores', () => {
      beforeEach(() => {
        disableExpandableFlyout();
        cy.task('esArchiverLoad', { archiveName: 'risk_scores_new' });
        deleteAlertsAndRules();
        createRule(getNewRule({ rule_id: 'rule1' }));
        login();
        enableRiskEngine();
        visitWithTimeRange(ALERTS_URL);
        waitForAlertsToPopulate();
      });

      afterEach(() => {
        cy.task('esArchiverUnload', 'risk_scores_new');
        cy.task('esArchiverUnload', 'risk_scores_new_updated');
        deleteRiskEngineConfiguration();
      });

      it('Should has enrichment fields from legacy risk', function () {
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .should('match', /^[1-9].+$/); // Any number of alerts
        cy.get(HOST_RISK_HEADER_COLUMN).contains('host.risk.calculated_level');
        cy.get(USER_RISK_HEADER_COLUMN).contains('user.risk.calculated_level');
        scrollAlertTableColumnIntoView(HOST_RISK_COLUMN);
        cy.get(HOST_RISK_COLUMN).contains('Critical');
        scrollAlertTableColumnIntoView(USER_RISK_COLUMN);
        cy.get(USER_RISK_COLUMN).contains('High');
        scrollAlertTableColumnIntoView(ACTION_COLUMN);
        expandFirstAlert();
        cy.get(ENRICHED_DATA_ROW).contains('Critical');
        cy.get(ENRICHED_DATA_ROW).contains(CURRENT_HOST_RISK_LEVEL);
        cy.get(ENRICHED_DATA_ROW).contains('Low').should('not.exist');
        cy.get(ENRICHED_DATA_ROW).contains(ORIGINAL_HOST_RISK_LEVEL).should('not.exist');

        closeAlertFlyout();
        cy.task('esArchiverUnload', 'risk_scores_new');
        cy.task('esArchiverLoad', { archiveName: 'risk_scores_new_updated' });
        expandFirstAlert();
        cy.get(ENRICHED_DATA_ROW).contains('Low');
        cy.get(ENRICHED_DATA_ROW).contains(ORIGINAL_HOST_RISK_LEVEL);
      });
    });
  });
});
