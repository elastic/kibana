/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIONS_EDIT_TAB } from '../../../screens/rule_edit';

export const goToActionsStepTab = () => {
  cy.get(ACTIONS_EDIT_TAB).click({ force: true });
};
