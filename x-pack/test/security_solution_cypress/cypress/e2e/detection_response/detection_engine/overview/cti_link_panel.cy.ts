/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OVERVIEW_CTI_ENABLE_MODULE_BUTTON,
  OVERVIEW_CTI_LINKS,
  OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL,
  OVERVIEW_CTI_TOTAL_EVENT_COUNT,
} from '../../../../screens/overview';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { OVERVIEW_URL } from '../../../../urls/navigation';

// TODO: https://github.com/elastic/kibana/issues/161539
// FLAKY: https://github.com/elastic/kibana/issues/165709
describe.skip('CTI Link Panel', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  it('renders disabled threat intel module as expected', () => {
    visit(OVERVIEW_URL);
    cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL}`).should('exist');
    cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 indicators');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`).should('exist');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`)
      .should('have.attr', 'href')
      .and('match', /app\/integrations\/browse\/threat_intel/);
  });

  // TODO: https://github.com/elastic/kibana/issues/161539
  describe(
    'enabled threat intel module',
    { tags: ['@ess', '@serverless', '@brokenInServerless'] },
    () => {
      before(() => {
        // illegal_argument_exception: unknown setting [index.lifecycle.name]
        cy.task('esArchiverLoad', { archiveName: 'threat_indicator' });
      });

      beforeEach(() => {
        login();
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'threat_indicator' });
      });

      it('renders disabled dashboard module as expected when there are no events in the selected time period', () => {
        visit(
          `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
        );
        cy.get(`${OVERVIEW_CTI_LINKS}`).should('exist');
        cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 indicators');
      });

      it('renders dashboard module as expected when there are events in the selected time period', () => {
        visit(OVERVIEW_URL);

        cy.get(`${OVERVIEW_CTI_LINKS}`).should('exist');
        cy.get(OVERVIEW_CTI_LINKS).should('not.contain.text', 'Anomali');
        cy.get(OVERVIEW_CTI_LINKS).should('contain.text', 'AbuseCH malware');
        cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 1 indicator');
      });
    }
  );
});
