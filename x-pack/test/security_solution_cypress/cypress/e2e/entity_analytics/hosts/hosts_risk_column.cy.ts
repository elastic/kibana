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
import { mockRiskEngineEnabled } from '../../../tasks/entity_analytics';

describe('All hosts table', { tags: ['@ess'] }, () => {
  describe('with legacy risk score', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_hosts' });
    });

    it('it renders risk column', () => {
      visitWithTimeRange(hostsUrl('allHosts'));
      kqlSearch('host.name: "siem-kibana" {enter}');

      cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
      cy.get(TABLE_CELL).eq(4).should('have.text', 'Low');
    });
  });

  describe('with new risk score', { tags: ['@serverless'] }, () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'risk_scores_new' });
    });

    beforeEach(() => {
      login();
      mockRiskEngineEnabled();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_scores_new' });
    });

    it('it renders risk column', () => {
      visitWithTimeRange(hostsUrl('allHosts'));
      kqlSearch('host.name: "siem-kibana" {enter}');

      cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
      cy.get(TABLE_CELL).eq(4).should('have.text', 'Critical');
    });
  });
});
