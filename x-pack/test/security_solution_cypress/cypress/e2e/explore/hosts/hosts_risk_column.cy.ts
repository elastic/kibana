/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { hostsUrl } from '../../../urls/navigation';
import { cleanKibana } from '../../../tasks/common';
import { TABLE_CELL } from '../../../screens/alerts_details';
import { kqlSearch } from '../../../tasks/security_header';

describe('All hosts table', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cleanKibana();
    // illegal_argument_exception: unknown setting [index.lifecycle.name]
    cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_hosts');
  });

  it('it renders risk column', () => {
    visit(hostsUrl('allHosts'));
    kqlSearch('host.name: "siem-kibana" {enter}');

    cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
    cy.get(`${TABLE_CELL} .euiTableCellContent`).eq(4).should('have.text', 'Low');
  });
});
