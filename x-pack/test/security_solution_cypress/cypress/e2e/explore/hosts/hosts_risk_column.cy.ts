/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { login, visit } from '../../../tasks/login';

import { HOSTS_URL } from '../../../urls/navigation';
import { cleanKibana } from '../../../tasks/common';
import { TABLE_CELL } from '../../../screens/alerts_details';
import { kqlSearch } from '../../../tasks/security_header';

describe('All hosts table', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', 'risk_hosts');
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_hosts');
  });

  it('it renders risk column', () => {
    visit(HOSTS_URL);
    kqlSearch('host.name: "siem-kibana" {enter}');

    cy.get('[data-test-subj="tableHeaderCell_node.risk_4"]').should('exist');
    cy.get(`${TABLE_CELL} .euiTableCellContent`).eq(4).should('have.text', 'Low');
  });
});
