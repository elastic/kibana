/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { hostsUrl } from '../../../urls/navigation';
import { TABLE_CELL } from '../../../screens/alerts_details';
import { kqlSearch } from '../../../tasks/security_header';
import { deleteRiskEngineConfiguration } from '../../../tasks/api_calls/risk_engine';
import { enableRiskEngine } from '../../../tasks/entity_analytics';

describe('All hosts table', { tags: ['@ess', '@serverless'] }, () => {
  describe('with legacy risk score', () => {
    before(() => {
      // illegal_argument_exception: unknown setting [index.lifecycle.name]
      cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
    });

    beforeEach(() => {
      login();
      deleteRiskEngineConfiguration();
    });

    after(() => {
      cy.task('esArchiverUnload', 'risk_hosts');
    });

    it('it renders risk column', () => {
      visitWithTimeRange(hostsUrl('allHosts'));
      kqlSearch('host.name: "siem-kibana" {enter}');

      cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
      cy.get(`${TABLE_CELL} .euiTableCellContent`).eq(4).should('have.text', 'Low');
    });
  });

  describe('with new risk score', () => {
    before(() => {
      // illegal_argument_exception: unknown setting [index.lifecycle.name]
      cy.task('esArchiverLoad', { archiveName: 'risk_scores_new' });
    });

    beforeEach(() => {
      login();
      enableRiskEngine();
    });

    after(() => {
      cy.task('esArchiverUnload', 'risk_scores_new');
      deleteRiskEngineConfiguration();
    });

    it('it renders risk column', () => {
      visitWithTimeRange(hostsUrl('allHosts'));
      kqlSearch('host.name: "siem-kibana" {enter}');

      cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
      cy.get(`${TABLE_CELL} .euiTableCellContent`).eq(4).should('have.text', 'Critical');
    });
  });
});
