/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PROCESS_NAME_FIELD,
  UNCOMMON_PROCESSES_TABLE,
} from '../../../screens/hosts/uncommon_processes';
import { TABLE_FIRST_PAGE, TABLE_SECOND_PAGE } from '../../../screens/table_pagination';
import { waitsForEventsToBeLoaded } from '../../../tasks/hosts/events';
import { openEvents, openUncommonProcesses } from '../../../tasks/hosts/main';
import { waitForUncommonProcessesToBeLoaded } from '../../../tasks/hosts/uncommon_processes';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { refreshPage } from '../../../tasks/security_header';
import { hostsUrl, usersUrl } from '../../../urls/navigation';
import { ALL_HOSTS_TABLE } from '../../../screens/hosts/all_hosts';
import { ALL_USERS_TABLE } from '../../../screens/users/all_users';
import { goToTablePage, sortFirstTableColumn } from '../../../tasks/table_pagination';

// FLAKY: https://github.com/elastic/kibana/issues/165968
describe('Pagination', { tags: ['@ess', '@serverless'] }, () => {
  describe('Host uncommon processes table)', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'host_uncommon_processes' });
    });

    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('uncommonProcesses'));
      waitForUncommonProcessesToBeLoaded();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'host_uncommon_processes' });
    });

    it('pagination updates results and page number', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');

      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(PROCESS_NAME_FIELD)
        .first()
        .invoke('text')
        .then((processNameFirstPage) => {
          goToTablePage(2);
          waitForUncommonProcessesToBeLoaded();
          cy.get(UNCOMMON_PROCESSES_TABLE)
            .find(PROCESS_NAME_FIELD)
            .first()
            .invoke('text')
            .should((processNameSecondPage) => {
              expect(processNameFirstPage).not.to.eq(processNameSecondPage);
            });
        });
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(TABLE_FIRST_PAGE)
        .should('not.have.attr', 'aria-current');
      cy.get(UNCOMMON_PROCESSES_TABLE).find(TABLE_SECOND_PAGE).should('have.attr', 'aria-current');
    });

    it('pagination keeps track of page results when tabs change', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
      goToTablePage(2);
      waitForUncommonProcessesToBeLoaded();

      cy.get(PROCESS_NAME_FIELD)
        .first()
        .invoke('text')
        .then((expectedThirdPageResult) => {
          openEvents();
          waitsForEventsToBeLoaded();
          cy.get(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
          openUncommonProcesses();
          waitForUncommonProcessesToBeLoaded();
          cy.get(TABLE_SECOND_PAGE).should('have.attr', 'aria-current');
          cy.get(PROCESS_NAME_FIELD)
            .first()
            .invoke('text')
            .should((actualThirdPageResult) => {
              expect(expectedThirdPageResult).to.eq(actualThirdPageResult);
            });
        });
    });

    it('pagination resets results and page number to first page when refresh is clicked', () => {
      cy.get(UNCOMMON_PROCESSES_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
      goToTablePage(2);
      waitForUncommonProcessesToBeLoaded();
      cy.get(UNCOMMON_PROCESSES_TABLE)
        .find(TABLE_FIRST_PAGE)
        .should('not.have.attr', 'aria-current');
      refreshPage();
      waitForUncommonProcessesToBeLoaded();
      cy.get(UNCOMMON_PROCESSES_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
    });
  });

  describe('All users and all Hosts tables', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
    });

    it(`reset all Hosts pagination when sorting column`, () => {
      visitWithTimeRange(hostsUrl('allHosts'));
      goToTablePage(2);
      cy.get(ALL_HOSTS_TABLE).find(TABLE_FIRST_PAGE).should('not.have.attr', 'aria-current');

      sortFirstTableColumn();

      cy.get(ALL_HOSTS_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
    });

    it(`reset all users pagination when sorting column`, () => {
      visitWithTimeRange(usersUrl('allUsers'));
      goToTablePage(2);
      cy.get(ALL_USERS_TABLE).find(TABLE_FIRST_PAGE).should('not.have.attr', 'aria-current');

      sortFirstTableColumn();

      cy.get(ALL_USERS_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');
    });
  });
});
