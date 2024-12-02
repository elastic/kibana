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
} from '../../screens/alerts';
import { ENRICHED_DATA_ROW } from '../../screens/alerts_details';

import { createRule } from '../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../tasks/api_calls/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  expandFirstAlert,
  scrollAlertTableColumnIntoView,
  closeAlertFlyout,
} from '../../tasks/alerts';

import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';

import { ALERTS_URL } from '../../urls/navigation';
import { mockRiskEngineEnabled } from '../../tasks/entity_analytics';

const CURRENT_HOST_RISK_LEVEL = 'Current host risk level';
const ORIGINAL_HOST_RISK_LEVEL = 'Original host risk level';

// this whole suite is failing on main
describe.skip('Enrichment', { tags: ['@ess'] }, () => {
  before(() => {
    cy.task('esArchiverUnload', { archiveName: 'risk_scores_new' });
    cy.task('esArchiverUnload', { archiveName: 'risk_scores_new_updated' });
    cy.task('esArchiverLoad', { archiveName: 'risk_users' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'risk_users' });
  });

  describe('Custom query rule', () => {
    describe('from new risk scores', () => {
      beforeEach(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_scores_new' });
        deleteAlertsAndRules();
        createRule(getNewRule({ rule_id: 'rule1' }));
        login();
        mockRiskEngineEnabled();
        visitWithTimeRange(ALERTS_URL);
        waitForAlertsToPopulate();
      });

      afterEach(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_scores_new' });
        cy.task('esArchiverUnload', { archiveName: 'risk_scores_new_updated' });
      });

      it('Should has enrichment fields risk', function () {
        cy.get(HOST_RISK_HEADER_COLUMN).contains('Host Risk Level');
        cy.get(USER_RISK_HEADER_COLUMN).contains('User Risk Level');
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
        cy.task('esArchiverUnload', { archiveName: 'risk_scores_new' });
        cy.task('esArchiverLoad', { archiveName: 'risk_scores_new_updated' });
        expandFirstAlert();
        cy.get(ENRICHED_DATA_ROW).contains('Low');
        cy.get(ENRICHED_DATA_ROW).contains(ORIGINAL_HOST_RISK_LEVEL);
      });
    });
  });
});
