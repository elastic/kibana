/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { APP_BLOCKLIST_PATH } from '../../../../common/constants';
import { loadPage, request } from './common';

export const removeExceptionsList = (listId: string) => {
  request({
    method: 'DELETE',
    url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
    failOnStatusCode: false,
  }).then(({ status }) => {
    expect(status).to.be.oneOf([200, 404]); // should either be success or not found
  });
};

const ENDPOINT_ARTIFACT_LIST_TYPES = {
  [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
};

export const createArtifactList = (listId: keyof typeof ENDPOINT_ARTIFACT_LIST_TYPES) => {
  request<ExceptionListSchema>({
    method: 'POST',
    url: EXCEPTION_LIST_URL,
    body: {
      name: listId,
      description: 'This is a test list',
      list_id: listId,
      type: ENDPOINT_ARTIFACT_LIST_TYPES[listId],
      namespace_type: 'agnostic',
    },
  }).then((response) => {
    expect(response.status).to.eql(200);
    expect(response.body.list_id).to.eql(listId);
    expect(response.body.type).to.eql(ENDPOINT_ARTIFACT_LIST_TYPES[listId]);
  });
};

export const createPerPolicyArtifact = (name: string, body: object, policyId?: 'all' | string) =>
  request<ExceptionListItemSchema>({
    method: 'POST',
    url: EXCEPTION_LIST_ITEM_URL,
    body: {
      name,
      description: '',
      type: 'simple',
      namespace_type: 'agnostic',
      ...body,
      ...(policyId ? { tags: [`policy:${policyId}`] } : {}),
    },
  }).then((response) => {
    expect(response.status).to.eql(200);
    expect(response.body.name).to.eql(name);
    return response;
  });

export const blocklistFormSelectors = {
  selectSignatureField: () => {
    cy.getByTestSubj('blocklist-form-field-select').click();
    cy.getByTestSubj('blocklist-form-file.Ext.code_signature').click();
  },
  selectOperator: (operator: 'is one of' | 'is') => {
    const matchOperator = operator === 'is' ? 'match' : 'match_any';
    cy.getByTestSubj('blocklist-form-operator-select-multi').click();
    cy.get(`button[role="option"][id="${matchOperator}"]`).click();
  },
  openBlocklist: ({ create, itemId }: { create?: boolean; itemId?: string } = {}) => {
    if (!create && !itemId) {
      loadPage(APP_BLOCKLIST_PATH);
    } else if (create) {
      loadPage(`${APP_BLOCKLIST_PATH}?show=create`);
    } else if (itemId) {
      loadPage(`${APP_BLOCKLIST_PATH}?itemId=${itemId}&show=edit`);
    }
  },
  fillOutBlocklistFlyout: () => {
    cy.getByTestSubj('blocklist-form-name-input').type('Test Blocklist');
    cy.getByTestSubj('blocklist-form-description-input').type('Test Description');
  },
  setMultiValue: () => {
    cy.getByTestSubj('blocklist-form-values-input').within(() => {
      cy.getByTestSubj('comboBoxSearchInput').type(`Elastic, Inc.{enter}`);
    });
  },
  setSingleValue: () => {
    cy.getByTestSubj('blocklist-form-value-input').type('Elastic, Inc.');
  },
  submitBlocklist: () => {
    cy.getByTestSubj('blocklistPage-flyout-submitButton').click();
  },
  validateSuccessPopup: (type: 'create' | 'update' | 'delete') => {
    let expectedTitle: string | RegExp = '';
    switch (type) {
      case 'create':
        expectedTitle = '"Test Blocklist" has been added to your blocklist.';
        break;
      case 'update':
        expectedTitle = /"Test Blocklist" has been updated/;
        break;
      case 'delete':
        expectedTitle = /"Test Blocklist" has been removed from .*blocklist/i;
        break;
    }
    cy.getByTestSubj('euiToastHeader__title').contains(expectedTitle);
  },
  validateRenderedCondition: (expectedCondition: RegExp) => {
    // Wait for flyout to close (after create/update) before looking for the card
    cy.getByTestSubj('blocklistPage-flyout').should('not.exist');
    cy.getByTestSubj('blocklistPage-card')
      .first()
      .within(() => {
        cy.getByTestSubj('blocklistPage-card-criteriaConditions-condition')
          .invoke('text')
          .should('match', expectedCondition);
      });
  },
  deleteBlocklistItem: () => {
    // Wait for list to load and card to appear
    cy.getByTestSubj('blocklistPage-card').should('exist');
    cy.getByTestSubj('blocklistPage-card')
      .first()
      .within(() => {
        cy.getByTestSubj('blocklistPage-card-header-actions-button').click();
      });

    cy.getByTestSubj('blocklistPage-card-cardDeleteAction').click();
    cy.getByTestSubj('blocklistPage-deleteModal-submitButton').click();
  },
};
