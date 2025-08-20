/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './api_calls/common';

export const deletePrivMonEngine = () => {
  return rootRequest({
    method: 'DELETE',
    url: `/api/entity_analytics/monitoring/engine/delete`,
    failOnStatusCode: false,
    timeout: 300000,
  });
};

export const uploadCSVFile = (fileName: string, content: string) => {
  return cy.get('[data-test-subj="privileged-user-monitoring-file-picker"]').selectFile({
    contents: Cypress.Buffer.from(content),
    fileName,
    mimeType: 'text/csv',
    lastModified: Date.now(),
  });
};

export const openFilePicker = () => {
  cy.get('[data-test-subj="privilegedUserMonitoringImportCSVCard"]').click();
};

export const clickFileUploaderAssignButton = () => {
  cy.get('[data-test-subj="privileged-user-monitoring-assign-button"]').click();
};
