/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_OBJECTS_SETTINGS } from '../screens/common/stack_management';

export const goToSavedObjectSettings = () => {
  cy.get(SAVED_OBJECTS_SETTINGS).scrollIntoView();
  cy.get(SAVED_OBJECTS_SETTINGS).should('be.visible').focus();
  cy.get(SAVED_OBJECTS_SETTINGS).should('be.visible').click();
};
