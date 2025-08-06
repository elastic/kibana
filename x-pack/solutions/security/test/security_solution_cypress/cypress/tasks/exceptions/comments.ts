/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTION_COMMENTS_ACCORDION_BTN,
  EXCEPTION_COMMENT_TEXT_AREA,
} from '../../screens/exceptions';

export const addExceptionHugeComment = (comment: string) => {
  cy.get(EXCEPTION_COMMENTS_ACCORDION_BTN).click();
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).type(` {backspace}`);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).invoke('val', comment);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).type(` {backspace}`);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).should('have.value', comment);
};

export const editExceptionComment = (comment: string) => {
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).clear();
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).type(`${comment}`);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).should('have.value', comment);
};
