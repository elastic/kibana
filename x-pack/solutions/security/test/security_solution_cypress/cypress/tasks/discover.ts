/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AVAILABLE_FIELD_COUNT,
  DISCOVER_CONTAINER,
  DISCOVER_ESQL_EDITABLE_INPUT,
  DISCOVER_ESQL_INPUT,
  DISCOVER_ESQL_INPUT_TEXT_CONTAINER,
  DISCOVER_FIELD_LIST_LOADING,
  DISCOVER_FIELD_SEARCH,
  GET_DISCOVER_COLUMN_TOGGLE_BTN,
  GET_DISCOVER_FIELD_BROWSER_FIELD_DETAILS_BUTTON,
  GET_DISCOVER_FIELD_BROWSER_POPOVER_FIELD_ADD_BUTTON,
} from '../screens/discover';
import { GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON } from '../screens/search_bar';

export const waitForDiscoverFieldsToLoad = () => {
  cy.get(AVAILABLE_FIELD_COUNT).should('be.visible');
};

export const assertFieldsAreLoaded = () => {
  cy.get(DISCOVER_FIELD_LIST_LOADING).should('not.exist');
};

export const fillEsqlQueryBar = (query: string) => {
  // eslint-disable-next-line cypress/no-force
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).should('exist').click({ force: true });

  const selectAll = Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a';
  // eslint-disable-next-line cypress/no-force
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).type(`${selectAll}{del}`, { force: true });

  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).then(($textarea) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', query);
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    $textarea[0].dispatchEvent(pasteEvent);
  });

  cy.window().then((win) => {
    const monacoApi = (win as any).MonacoEnvironment?.monaco;
    if (monacoApi) {
      monacoApi.editor.getModels().forEach((model: any) => {
        const value = model.getValue();
        const normalized = value.replace(/\u00a0/g, ' ');
        if (normalized !== value) {
          model.setValue(normalized);
        }
      });
    }
  });

  cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).should(($input) => {
    expect(convertEditorNonBreakingSpaceToSpace($input.text())).to.eq(query);
  });
};

export const selectCurrentDiscoverEsqlQuery = (
  discoverEsqlInput = DISCOVER_ESQL_EDITABLE_INPUT
) => {
  // eslint-disable-next-line cypress/no-force
  cy.get(discoverEsqlInput).click({ force: true });
  // eslint-disable-next-line cypress/no-force
  cy.get(discoverEsqlInput).type(Cypress.platform === 'darwin' ? '{cmd+a}' : '{ctrl+a}', {
    force: true,
  });
};

export const addDiscoverEsqlQuery = (esqlQuery: string) => {
  fillEsqlQueryBar(esqlQuery);
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).blur();
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).click();
};

export const waitForESQLInputToBeVisible = () => {
  cy.get(DISCOVER_ESQL_INPUT).should('be.visible');
  cy.get('[role="code"]').should('have.class', 'focused');
};

export const convertEditorNonBreakingSpaceToSpace = (str: string) => {
  return str.replaceAll(String.fromCharCode(160), ' ');
};

export const verifyDiscoverEsqlQuery = (esqlQueryToVerify: string) => {
  // We select the query first as multi-line queries do not render fully unless all the text is selected
  selectCurrentDiscoverEsqlQuery();
  /**
   * When selected all visual spaces actually render the middot character, so we replace the spaces with the middot
   * If testing without selecting first you can replace with a Non-breaking space character
   * https://github.com/cypress-io/cypress/issues/15863#issuecomment-816746693
   */
  const unicodeReplacedQuery = esqlQueryToVerify.replaceAll(' ', '\u00b7');
  cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).should(
    ($input) => $input.text() === unicodeReplacedQuery
  );
};

export const submitDiscoverSearchBar = () => {
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).trigger('click');
};

const searchForField = (fieldId: string) => {
  cy.get(DISCOVER_FIELD_SEARCH).filter(':visible');
  cy.get(DISCOVER_FIELD_SEARCH).type(fieldId);
};

export const clearFieldSearch = () => {
  cy.get(DISCOVER_FIELD_SEARCH).filter(':visible').clear();
};

export const addFieldToTable = (fieldId: string, container: string) => {
  cy.get(container).within(() => {
    searchForField(fieldId);
    cy.get(GET_DISCOVER_FIELD_BROWSER_FIELD_DETAILS_BUTTON(fieldId)).eq(0).click();
  });
  cy.get(GET_DISCOVER_FIELD_BROWSER_POPOVER_FIELD_ADD_BUTTON(fieldId)).should('exist');
  cy.get(GET_DISCOVER_FIELD_BROWSER_POPOVER_FIELD_ADD_BUTTON(fieldId)).click();

  clearFieldSearch();
};

export const removeFieldFromTable = (fieldId: string) => {
  cy.get(GET_DISCOVER_COLUMN_TOGGLE_BTN(fieldId)).first().click();
};
