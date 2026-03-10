/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTRA_MANAGED_DATA_TITLE,
  OKTA_MANAGED_DATA_TITLE,
} from '../../screens/users/flyout_user_panel';

export const expandManagedDataEntraPanel = () => {
  cy.get(ENTRA_MANAGED_DATA_TITLE).click();
};

export const expandManagedDataOktaPanel = () => {
  cy.get(OKTA_MANAGED_DATA_TITLE).click();
};
