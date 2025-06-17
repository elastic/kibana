/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPACE_SELECTOR_COMBO_BOX,
  SECURITY_CATEGORY,
} from '../screens/custom_roles/assign_to_space_flyout';
import { ASSIGN_TO_SPACE_BUTTON } from '../screens/custom_roles/custom_role_page';

export const selectAllSpaces = (): void => {
  cy.get(ASSIGN_TO_SPACE_BUTTON).click();

  // select all spaces
  cy.get(SPACE_SELECTOR_COMBO_BOX).click();
  cy.get(SPACE_SELECTOR_COMBO_BOX).type('* All Spaces');
  cy.get(SPACE_SELECTOR_COMBO_BOX).type('{enter}');

  // expand security category
  cy.get(SECURITY_CATEGORY).click();
};
