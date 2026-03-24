/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSIGN_BUTTON, FILE_PICKER } from '../screens/asset_criticality';

export const clickAssignButton = () => {
  cy.get(ASSIGN_BUTTON).click();
};

export const uploadAssetCriticalityFile = () => {
  cy.get(FILE_PICKER).selectFile({
    contents: Cypress.Buffer.from(
      'user,user-001,medium_impact\nuser,user-002,medium_impact\nhost,host-001,extreme_impact\nhost,host-002,extreme_impact\nhost,host-003,invalid_value'
    ),
    fileName: 'asset_criticality.csv',
    lastModified: Date.now(),
  });
};
