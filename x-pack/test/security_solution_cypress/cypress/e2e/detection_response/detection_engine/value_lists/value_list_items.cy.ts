/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import {
  createListsIndex,
  waitForValueListsModalToBeLoaded,
  openValueListsModal,
  importValueList,
  waitForListsIndex,
  deleteValueLists,
  KNOWN_VALUE_LIST_FILES,
  openValueListItemsModal,
  searchValueListItemsModal,
  getValueListItemsTableRow,
  checkTotalItems,
  deleteListItem,
  clearSearchValueListItemsModal,
  sortByValue,
  updateListItem,
  addListItem,
} from '../../../../tasks/lists';
import {
  VALUE_LIST_ITEMS_MODAL_INFO,
  VALUE_LIST_ITEMS_MODAL_TABLE,
  VALUE_LIST_ITEMS_MODAL_TITLE,
} from '../../../../screens/lists';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';

describe(
  'Value list items',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['valueListItemsModal'])}`,
        ],
      },
    },
  },
  () => {
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

    afterEach(() => {
      deleteValueLists([
        KNOWN_VALUE_LIST_FILES.TEXT,
        KNOWN_VALUE_LIST_FILES.IPs,
        KNOWN_VALUE_LIST_FILES.CIDRs,
      ]);
    });

    it('can CRUD value list items', () => {
      importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'keyword');
      openValueListsModal();
      openValueListItemsModal(KNOWN_VALUE_LIST_FILES.TEXT);
      const totalItems = 12;
      const perPage = 10;

      // check modal title and info
      cy.get(VALUE_LIST_ITEMS_MODAL_TITLE).should('have.text', KNOWN_VALUE_LIST_FILES.TEXT);
      cy.get(VALUE_LIST_ITEMS_MODAL_INFO).contains('Type: keyword');
      cy.get(VALUE_LIST_ITEMS_MODAL_INFO).contains('Updated by: system_indices_superuse');
      checkTotalItems(totalItems);

      // search working
      getValueListItemsTableRow().should('have.length', perPage);
      searchValueListItemsModal('keyword:not_exists');
      getValueListItemsTableRow().should('have.length', 1);
      cy.get(VALUE_LIST_ITEMS_MODAL_TABLE).contains('No items found');

      searchValueListItemsModal('keyword:*or*');
      getValueListItemsTableRow().should('have.length', 4);

      clearSearchValueListItemsModal('');
      getValueListItemsTableRow().should('have.length', perPage);

      // sort working
      sortByValue();
      getValueListItemsTableRow().first().contains('a');

      // delete item
      deleteListItem('a');
      checkTotalItems(totalItems - 1);

      getValueListItemsTableRow().first().contains('are');

      // update item
      updateListItem('are', 'b');
      getValueListItemsTableRow().first().contains('b');

      // add item
      addListItem('a new item');
      getValueListItemsTableRow().first().contains('a new item');
      checkTotalItems(totalItems);
    });
  }
);
