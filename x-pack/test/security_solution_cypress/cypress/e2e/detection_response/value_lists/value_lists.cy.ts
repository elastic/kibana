/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
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
} from '../../../tasks/lists';
import {
  VALUE_LISTS_TABLE,
  VALUE_LISTS_ROW,
  VALUE_LISTS_MODAL_ACTIVATOR,
} from '../../../screens/lists';
import { refreshIndex } from '../../../tasks/api_calls/elasticsearch';

const TEXT_LIST_FILE_NAME = 'value_list.txt';
const IPS_LIST_FILE_NAME = 'ip_list.txt';
const CIDRS_LIST_FILE_NAME = 'cidr_list.txt';

describe('value lists', () => {
  describe('management modal', { tags: ['@ess', '@serverless'] }, () => {
    beforeEach(() => {
      login();
      deleteValueLists([TEXT_LIST_FILE_NAME, IPS_LIST_FILE_NAME, CIDRS_LIST_FILE_NAME]);
      createListsIndex();
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      waitForListsIndex();
      waitForValueListsModalToBeLoaded();
    });

    it('can open and close the modal', () => {
      openValueListsModal();
      closeValueListsModal();
    });

    // Flaky in serverless tests
    describe('create list types', { tags: ['@brokenInServerless'] }, () => {
      beforeEach(() => {
        openValueListsModal();
      });

      it('creates a "keyword" list from an uploaded file', () => {
        selectValueListType('keyword');
        selectValueListsFile(TEXT_LIST_FILE_NAME);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(TEXT_LIST_FILE_NAME);
            expect($row.text()).to.contain('Keywords');
          });
      });

      it('creates a "text" list from an uploaded file', () => {
        selectValueListType('text');
        selectValueListsFile(TEXT_LIST_FILE_NAME);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(TEXT_LIST_FILE_NAME);
            expect($row.text()).to.contain('Text');
          });
      });

      it('creates a "ip" list from an uploaded file', () => {
        selectValueListType('ip');
        selectValueListsFile(IPS_LIST_FILE_NAME);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(IPS_LIST_FILE_NAME);
            expect($row.text()).to.contain('IP addresses');
          });
      });

      it('creates a "ip_range" list from an uploaded file', () => {
        selectValueListType('ip_range');
        selectValueListsFile(CIDRS_LIST_FILE_NAME);
        uploadValueList();

        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).to.contain(CIDRS_LIST_FILE_NAME);
            expect($row.text()).to.contain('IP ranges');
          });
      });
    });

    // Flaky in serverless tests
    describe('delete list types', { tags: ['@brokenInServerless'] }, () => {
      it('deletes a "keyword" list from an uploaded file', () => {
        importValueList(TEXT_LIST_FILE_NAME, 'keyword');
        openValueListsModal();
        deleteValueListsFile(TEXT_LIST_FILE_NAME);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(TEXT_LIST_FILE_NAME);
          });
      });

      it('deletes a "text" list from an uploaded file', () => {
        importValueList(TEXT_LIST_FILE_NAME, 'text');
        openValueListsModal();
        deleteValueListsFile(TEXT_LIST_FILE_NAME);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(TEXT_LIST_FILE_NAME);
          });
      });

      it('deletes a "ip" from an uploaded file', () => {
        importValueList(IPS_LIST_FILE_NAME, 'ip');
        openValueListsModal();
        deleteValueListsFile(IPS_LIST_FILE_NAME);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(IPS_LIST_FILE_NAME);
          });
      });

      it('deletes a "ip_range" from an uploaded file', () => {
        importValueList(CIDRS_LIST_FILE_NAME, 'ip_range', ['192.168.100.0']);
        openValueListsModal();
        deleteValueListsFile(CIDRS_LIST_FILE_NAME);
        cy.get(VALUE_LISTS_TABLE)
          .find(VALUE_LISTS_ROW)
          .should(($row) => {
            expect($row.text()).not.to.contain(CIDRS_LIST_FILE_NAME);
          });
      });
    });

    // Flaky in serverless tests
    describe('export list types', { tags: ['@brokenInServerless'] }, () => {
      it('exports a "keyword" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${TEXT_LIST_FILE_NAME}`).as(
          'exportList'
        );
        importValueList(TEXT_LIST_FILE_NAME, 'keyword');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();

        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(TEXT_LIST_FILE_NAME).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "text" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${TEXT_LIST_FILE_NAME}`).as(
          'exportList'
        );
        importValueList(TEXT_LIST_FILE_NAME, 'text');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();

        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(TEXT_LIST_FILE_NAME).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "ip" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${IPS_LIST_FILE_NAME}`).as(
          'exportList'
        );
        importValueList(IPS_LIST_FILE_NAME, 'ip');

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();
        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(IPS_LIST_FILE_NAME).then((list: string) => {
            const [lineOne, lineTwo] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
            expect(response?.body).to.contain(lineTwo);
          });
        });
      });

      it('exports a "ip_range" list from an uploaded file', () => {
        cy.intercept('POST', `/api/lists/items/_export?list_id=${CIDRS_LIST_FILE_NAME}`).as(
          'exportList'
        );
        importValueList(CIDRS_LIST_FILE_NAME, 'ip_range', ['192.168.100.0']);

        // Importing value lists includes bulk creation of list items with refresh=wait_for
        // While it should wait for data update and return after that it's not always a case with bulk operations.
        // Sometimes list items are empty making this test flaky.
        // To fix it refresh used list items index (for the default space)
        refreshIndex('.items-default');

        openValueListsModal();
        exportValueList();
        cy.wait('@exportList').then(({ response }) => {
          cy.fixture(CIDRS_LIST_FILE_NAME).then((list: string) => {
            const [lineOne] = list.split('\n');
            expect(response?.body).to.contain(lineOne);
          });
        });
      });
    });
  });

  describe('user with restricted access role', { tags: '@ess' }, () => {
    it('Does not allow a t1 analyst user to upload a value list', () => {
      login(ROLES.t1_analyst);
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL, ROLES.t1_analyst);
      cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('have.attr', 'disabled');
    });
  });
});
