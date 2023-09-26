/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import {
  createListsIndex,
  waitForValueListsModalToBeLoaded,
  openValueListsModal,
  selectValueListsFile,
  uploadValueList,
  selectValueListType,
  closeValueListsModal,
  importValueList,
  deleteValueListsFile,
  exportValueList,
  waitForListsIndex,
  deleteValueLists,
  KNOWN_VALUE_LIST_FILES,
} from '../../../tasks/lists';
import {
  VALUE_LISTS_TABLE,
  VALUE_LISTS_ROW,
  VALUE_LISTS_MODAL_ACTIVATOR,
} from '../../../screens/lists';
import { refreshIndex } from '../../../tasks/api_calls/elasticsearch';

// TODO: https://github.com/elastic/kibana/issues/161539
// FLAKY: https://github.com/elastic/kibana/issues/165699
describe('value lists', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  // TODO: https://github.com/elastic/kibana/issues/161539
  describe('management modal', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
    beforeEach(() => {
      login();
      deleteValueLists([
        KNOWN_VALUE_LIST_FILES.TEXT,
        KNOWN_VALUE_LIST_FILES.IPs,
        KNOWN_VALUE_LIST_FILES.CIDRs,
      ]);
      createListsIndex();
      visit(RULES_MANAGEMENT_URL);
      waitForListsIndex();
      waitForValueListsModalToBeLoaded();
    });

    it('can open and close the modal', () => {
      openValueListsModal();
      closeValueListsModal();
    });

    // TODO: https://github.com/elastic/kibana/issues/161539
    // Flaky in serverless tests
    describe('create list types', { tags: ['@brokenInServerless'] }, () => {
      beforeEach(() => {
        openValueListsModal();
      });

      it('creates a "keyword" list from an uploaded file', () => {
        selectValueListType('keyword');
        selectValueListsFile(KNOWN_VALUE_LIST_FILES.TEXT);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(KNOWN_VALUE_LIST_FILES.TEXT);
            expect($row.text()).to.contain('Keywords');
          });
      });

      it('creates a "text" list from an uploaded file', () => {
        selectValueListType('text');
        selectValueListsFile(KNOWN_VALUE_LIST_FILES.TEXT);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(KNOWN_VALUE_LIST_FILES.TEXT);
            expect($row.text()).to.contain('Text');
          });
      });

      it('creates a "ip" list from an uploaded file', () => {
        selectValueListType('ip');
        selectValueListsFile(KNOWN_VALUE_LIST_FILES.IPs);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(KNOWN_VALUE_LIST_FILES.IPs);
            expect($row.text()).to.contain('IP addresses');
          });
      });

      it('creates a "ip_range" list from an uploaded file', () => {
        selectValueListType('ip_range');
        selectValueListsFile(KNOWN_VALUE_LIST_FILES.CIDRs);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(KNOWN_VALUE_LIST_FILES.CIDRs);
            expect($row.text()).to.contain('IP ranges');
          });
      });
    });

    // TODO: https://github.com/elastic/kibana/issues/161539
    // Flaky in serverless tests
    describe('delete list types', { tags: ['@brokenInServerless'] }, () => {
      it('deletes a "keyword" list from an uploaded file', () => {
        importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'keyword');
        openValueListsModal();
        deleteValueListsFile(KNOWN_VALUE_LIST_FILES.TEXT);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(KNOWN_VALUE_LIST_FILES.TEXT);
          });
      });

      it('deletes a "text" list from an uploaded file', () => {
        importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'text');
        openValueListsModal();
        deleteValueListsFile(KNOWN_VALUE_LIST_FILES.TEXT);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(KNOWN_VALUE_LIST_FILES.TEXT);
          });
      });

      it('deletes a "ip" from an uploaded file', () => {
        importValueList(KNOWN_VALUE_LIST_FILES.IPs, 'ip');
        openValueListsModal();
        deleteValueListsFile(KNOWN_VALUE_LIST_FILES.IPs);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(KNOWN_VALUE_LIST_FILES.IPs);
          });
      });

      it('deletes a "ip_range" from an uploaded file', () => {
        importValueList(KNOWN_VALUE_LIST_FILES.CIDRs, 'ip_range', ['192.168.100.0']);
        openValueListsModal();
        deleteValueListsFile(KNOWN_VALUE_LIST_FILES.CIDRs);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(KNOWN_VALUE_LIST_FILES.CIDRs);
          });
      });
    });

    // TODO: https://github.com/elastic/kibana/issues/161539
    // Flaky in serverless tests
    describe('export list types', { tags: ['@brokenInServerless'] }, () => {
      it('exports a "keyword" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${KNOWN_VALUE_LIST_FILES.TEXT}`).as(
          'exportList'
        );
        importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'keyword');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();

        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(KNOWN_VALUE_LIST_FILES.TEXT).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "text" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${KNOWN_VALUE_LIST_FILES.TEXT}`).as(
          'exportList'
        );
        importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'text');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();

        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(KNOWN_VALUE_LIST_FILES.TEXT).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "ip" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${KNOWN_VALUE_LIST_FILES.IPs}`).as(
          'exportList'
        );
        importValueList(KNOWN_VALUE_LIST_FILES.IPs, 'ip');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();
        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(KNOWN_VALUE_LIST_FILES.IPs).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "ip_range" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${KNOWN_VALUE_LIST_FILES.CIDRs}`).as(
          'exportList'
        );
        importValueList(KNOWN_VALUE_LIST_FILES.CIDRs, 'ip_range', ['192.168.100.0']);

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();
        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(KNOWN_VALUE_LIST_FILES.CIDRs).then((list: string) => {
            const [lineOne] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
          });
        });
      });
    });
  });

  // TODO: https://github.com/elastic/kibana/issues/164451 We should find a way to make this spec work in Serverless
  // TODO: https://github.com/elastic/kibana/issues/161539
  describe(
    'user with restricted access role',
    { tags: ['@ess', '@serverless', '@skipInServerless'] },
    () => {
      it('Does not allow a t1 analyst user to upload a value list', () => {
        login(ROLES.t1_analyst);
        visit(RULES_MANAGEMENT_URL, { role: ROLES.t1_analyst });
        cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('have.attr', 'disabled');
      });
    }
  );
});
