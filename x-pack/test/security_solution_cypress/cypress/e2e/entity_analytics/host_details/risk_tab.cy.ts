/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitHostDetailsPage } from '../../../tasks/navigation';
import { deleteRiskEngineConfiguration } from '../../../tasks/api_calls/risk_engine';
import { openRiskInformationFlyout, mockRiskEngineEnabled } from '../../../tasks/entity_analytics';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';
import { RISK_INFORMATION_FLYOUT_HEADER } from '../../../screens/entity_analytics';
import { navigateToHostRiskDetailTab } from '../../../tasks/host_risk';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';

describe('risk tab', { tags: ['@ess'] }, () => {
  describe('with risk score', { tags: ['@serverless'] }, () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'risk_scores_new_complete_data' });
      cy.task('esArchiverLoad', { archiveName: 'query_alert', useCreate: true, docsOnly: true });
    });

    beforeEach(() => {
      mockRiskEngineEnabled();
      login();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_scores_new_complete_data' });
      deleteAlertsAndRules(); // esArchiverUnload doesn't work properly when using with `useCreate` and `docsOnly` flags
      deleteRiskEngineConfiguration();
    });

    it('renders risk tab', () => {
      visitHostDetailsPage('Host-fwarau82er');
      navigateToHostRiskDetailTab();

      cy.get(ALERTS_COUNT).should('have.text', '1 alert');
      cy.get(ALERT_GRID_CELL).contains('Endpoint Security');
    });

    it('shows risk information overlay when button is clicked', () => {
      visitHostDetailsPage('siem-kibana');
      navigateToHostRiskDetailTab();

      openRiskInformationFlyout();

      cy.get(RISK_INFORMATION_FLYOUT_HEADER).contains('Entity Risk Analytics');
    });
  });
});
